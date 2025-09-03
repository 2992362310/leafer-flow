<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps<{
  selectedTool?: string | null
  isDrawing?: boolean
  elementCount?: number
}>()

const isCollapsed = ref(false)


// 获取当前工具的显示名称
const currentToolName = computed(() => {
  if (!props.selectedTool) return '无'
  return props.selectedTool
})

// 获取工具状态描述
const toolStatus = computed(() => {
  if (!props.selectedTool || props.selectedTool === 'select') {
    return '选择模式：点击元素可选中并编辑'
  }
  return '绘制模式：所有元素已锁定，无法编辑'
})

// 获取状态类
const statusClass = computed(() => {
  if (!props.selectedTool || props.selectedTool === 'select') {
    return 'alert-success'
  }
  return 'alert-info'
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="bg-base-100 rounded-lg shadow-md p-2 min-w-[200px]">
    <!-- 折叠按钮 -->
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-sm">状态信息</span>
      <button @click="toggleCollapse" class="btn btn-xs btn-ghost">
        <Icon :name="isCollapsed ? 'arrow-down' : 'arrow-up'" class="h-3 w-3" />
      </button>
    </div>

    <!-- 折叠内容 -->
    <div v-show="!isCollapsed">
      <!-- 元素统计 -->
      <div v-if="elementCount !== undefined" class="mb-2">
        <div class="badge badge-ghost text-xs">
          元素总数: {{ elementCount }}
        </div>
      </div>

      <!-- 当前工具显示 -->
      <div class="mb-2">
        <div class="badge badge-neutral text-xs">
          当前工具: {{ currentToolName }}
        </div>
      </div>

      <!-- 绘制状态提示 -->
      <div v-if="isDrawing && selectedTool && selectedTool !== 'select'" class="mb-2">
        <div class="alert alert-warning py-2 px-3 text-xs">
          <Icon name="clear" class="stroke-current shrink-0 h-4 w-4" />
          <span>正在绘制 {{ currentToolName }}... (ESC或右键取消)</span>
        </div>
      </div>

      <!-- 工具状态提示 -->
      <div class="mb-2">
        <div class="alert py-2 px-3 text-xs" :class="statusClass">
          <Icon v-if="!selectedTool || selectedTool === 'select'" name="select"
            class="stroke-current shrink-0 h-4 w-4" />
          <Icon v-else name="draw_circle" class="stroke-current shrink-0 h-4 w-4" />
          <span>{{ toolStatus }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
