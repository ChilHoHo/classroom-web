export async function backfillTeacherRegistrations(db) {
  const candidates = await db.all(`SELECT u.id FROM users u
    WHERE u.role='teacher' AND u.status='pending' AND NOT EXISTS (
      SELECT 1 FROM change_requests r WHERE r.user_id=u.id AND r.kind='teacher_registration'
    ) ORDER BY u.id`)

  for (const { id } of candidates) {
    await db.transaction(async () => {
      const user = await db.get('SELECT role,status,created_at FROM users WHERE id=?' + db.lock, [id])
      if (user?.role !== 'teacher' || user.status !== 'pending') return

      const existing = await db.get(`SELECT id FROM change_requests
        WHERE user_id=? AND kind='teacher_registration'` + db.lock, [id])
      if (existing) return

      const teacher = await db.get('SELECT name,teacher_no FROM teachers WHERE user_id=?', [id])
      const createdAt = user.created_at instanceof Date
        ? user.created_at.toISOString()
        : user.created_at?.replace(/^([\d-]+) ([\d:]+)$/, '$1T$2Z')
      await db.run(`INSERT INTO change_requests(user_id,kind,target_id,payload,created_at)
        VALUES (?,'teacher_registration',?,?,?)`, [id, id, JSON.stringify(teacher), createdAt || new Date().toISOString()])
    })
  }
}
