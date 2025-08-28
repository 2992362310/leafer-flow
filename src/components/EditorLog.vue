<script setup lang="ts">
import { ref } from 'vue'

const eventLog = ref<string[]>([])

// 添加事件日志函数
const addEventLog = (message: string) => {
  eventLog.value.unshift(message)
  if (eventLog.value.length > 5) {
    eventLog.value.pop()
  }
}

function handleClick() {
  eventLog.value = []
}

defineExpose({
  addEventLog,
})
</script>

<template>
  <div class="card bg-base-100 shadow-lg w-64">
    <div class="card-body p-3">
      <div class="flex justify-between items-center mb-2">
        <h3 class="card-title text-sm">事件日志</h3>
        <button @click="handleClick" class="btn btn-xs btn-ghost" title="清空日志">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="text-xs space-y-1 max-h-32 overflow-y-auto">
        <div v-for="(log, index) in eventLog" :key="index" class="text-gray-600">
          {{ log }}
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400">暂无事件...</div>
      </div>
    </div>
  </div>
</template>
