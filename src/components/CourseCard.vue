<script setup>
import { computed } from 'vue'
import { dateKey, formatTime } from '@/dashboard.js'
const props = defineProps({
  course: Object,
  session: Object,
  now: Number,
  today: Boolean,
  hasScheduledSessions: Boolean,
})
defineEmits(['details'])

const status = computed(() => {
  const { session, now, hasScheduledSessions } = props
  if (!session && !hasScheduledSessions) return { label: '待排课', type: 'info' }
  if (!session || Date.parse(session.end_at) <= now) return { label: '已结束', type: 'info' }
  if (Date.parse(session.start_at) <= now) return { label: '进行中', type: 'success' }
  return { label: '待上课', type: 'primary' }
})
</script>
<template>
  <el-card shadow="hover" class="course-card">
    <div class="course-top">
      <span>{{ course.name }}</span>
      <el-tag :type="status.type">{{ status.label }}</el-tag>
    </div>
    <h3>{{ course.course_name }}</h3><p class="english-name">{{ course.english_name || '未填写英文名称' }}</p>
    <div v-if="session" class="course-meta"><span>{{ today ? '上课时间' : '下次上课' }}</span><strong>{{ today ? '' : dateKey(session.start_at) + ' ' }}{{ formatTime(session.start_at) }}–{{ formatTime(session.end_at) }}</strong><span>上课地点</span><strong>{{ session.location }}</strong></div>
    <p v-else class="muted">{{ hasScheduledSessions ? '暂无后续课次' : '暂无课程安排' }}</p>
    <div class="course-footer">
      <div class="course-footer-meta">
        <span v-if="course.teacher_name">授课教师：{{ course.teacher_name }}</span>
        <span v-if="course.term">{{ course.term }}</span>
        <span v-if="session?.change_reason">已调课</span>
      </div>
      <el-button link type="primary" @click="$emit('details', course)">查看课程</el-button>
    </div>
  </el-card>
</template>
<style scoped>
.course-card { border-top: 3px solid var(--el-color-primary-light-5); }
.course-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--el-text-color-secondary); font-size: 13px; }
h3 { margin: 22px 0 8px; font-size: 26px; font-weight: 600; overflow-wrap: anywhere; }.english-name { margin: 0 0 26px; color: var(--el-text-color-regular); font-size: 17px; overflow-wrap: anywhere; }
.course-meta { display: grid; grid-template-columns: 70px 1fr; gap: 12px; font-size: 14px; }.course-meta span,.muted { color: var(--el-text-color-secondary); }.course-meta strong { font-weight: 400; line-height: 1.5; }
.course-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 25px; padding-top: 16px; border-top: 1px solid var(--el-border-color-lighter); color: var(--el-text-color-secondary); font-size: 12px; }
.course-footer-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; }
</style>
