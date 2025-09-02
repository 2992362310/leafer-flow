<script setup lang="ts">
import { ref, nextTick } from 'vue'
import Icon from './Icon.vue'

interface LogEntry {
  id: number
  message: string
  timestamp: Date
  level: 'info' | 'success' | 'warning' | 'error'
}

const eventLog = ref<LogEntry[]>([])
let logId = 0

// 添加事件日志函数
const addEventLog = (message: string, level: LogEntry['level'] = 'info') => {
  const newLog: LogEntry = {
    id: logId++,
    message,
    timestamp: new Date(),
    level
  }
  
  eventLog.value.unshift(newLog)
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
  
  // 自动滚动到顶部
  nextTick(() => {
    const container = document.querySelector('.event-log-container')
    if (container) {
      container.scrollTop = 0
    }
  })
}

function handleClick() {
  eventLog.value = []
}

// 添加不同级别的日志方法
const addInfoLog = (message: string) => {
  addEventLog(message, 'info')
}

const addSuccessLog = (message: string) => {
  addEventLog(message, 'success')
}

const addWarningLog = (message: string) => {
  addEventLog(message, 'warning')
}

const addErrorLog = (message: string) => {
  addEventLog(message, 'error')
}

// 获取日志级别的显示类
const getLogClass = (level: LogEntry['level']) => {
  switch (level) {
    case 'success':
      return 'text-green-600'
    case 'warning':
      return 'text-yellow-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

// 格式化时间显示
const formatTime = (date: Date) => {
  return date.toTimeString().slice(0, 8)
}

defineExpose({
  addEventLog,
  addInfoLog,
  addSuccessLog,
  addWarningLog,
  addErrorLog
})
</script>

<template>
  <div class="card bg-base-100 shadow-lg w-80">
    <div class="card-body p-3">
      <div class="flex justify-between items-center mb-2">
        <h3 class="card-title text-sm">事件日志</h3>
        <button @click="handleClick" class="btn btn-xs btn-ghost" title="清空日志">
          <Icon name="clear" class="h-3 w-3" />
        </button>
      </div>
      <div class="text-xs space-y-1 max-h-48 overflow-y-auto event-log-container">
        <div 
          v-for="log in eventLog" 
          :key="log.id" 
          class="flex items-start"
          :class="getLogClass(log.level)"
        >
          <span class="mr-2 whitespace-nowrap">{{ formatTime(log.timestamp) }}</span>
          <span class="flex-1">{{ log.message }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-2">
          暂无事件...
        </div>
      </div>
    </div>
  </div>
</template>