import { test } from 'node:test'
import assert from 'node:assert/strict'
import { client, createUser, db } from './helpers/account-api.js'
import { backfillTeacherRegistrations } from '../server/db/teacher-registration-migration.js'

test('teacher registration uses the shared request queue and preserves review history', async () => {
  const admin = client()
  const teacher = client()
  const denied = client()
  await admin.login('admin', process.env.ADMIN_PASSWORD)
  await teacher.register('pending_teacher', 'teacher', 'P-001')
  await denied.register('denied_teacher', 'teacher', 'P-002')
  await teacher.login('pending_teacher', 'Password123', 403)

  const requests = async () => (await admin.request('/requests')).items
  const pending = (await requests()).find(row => row.username === 'pending_teacher')
  assert.equal(pending.kind, 'teacher_registration')
  assert.equal(pending.status, 'pending')
  assert.deepEqual(pending.payload, { name: 'pending_teacher', teacher_no: 'P-001' })
  await admin.request(`/requests/${pending.id}`, 'PATCH', { status: 'approved', note: '已核实' })
  await admin.request(`/requests/${pending.id}`, 'PATCH', { status: 'rejected', note: '重复处理' }, 409)
  await teacher.login('pending_teacher')
  const approved = (await teacher.request('/requests')).items.find(row => row.id === pending.id)
  assert.equal(approved.status, 'approved')
  assert.equal(approved.review_note, '已核实')
  assert.ok(approved.reviewed_at)

  const rejected = (await requests()).find(row => row.username === 'denied_teacher')
  await admin.request(`/requests/${rejected.id}`, 'PATCH', { status: 'rejected', note: '资料不符' })
  await denied.login('denied_teacher', 'Password123', 403)
  assert.equal((await requests()).find(row => row.id === rejected.id).status, 'rejected')
})

test('backfill links an existing pending teacher once and the legacy endpoint updates the request', async () => {
  const admin = client()
  await admin.login('admin', process.env.ADMIN_PASSWORD)
  const userId = await createUser('legacy_teacher', 'Password123', 'teacher')
  await db.run("UPDATE users SET status='pending',created_at='2026-11-17 03:10:07' WHERE id=?", [userId])
  await backfillTeacherRegistrations(db)
  await backfillTeacherRegistrations(db)

  const items = (await admin.request('/requests')).items.filter(row => row.user_id === userId)
  assert.equal(items.length, 1)
  assert.equal(items[0].created_at, '2026-11-17T03:10:07Z')
  await admin.request(`/users/${userId}`, 'PATCH', { status: 'active' })
  const reviewed = (await admin.request('/requests')).items.find(row => row.id === items[0].id)
  assert.equal(reviewed.status, 'approved')
  assert.ok(reviewed.reviewer_id)
})
