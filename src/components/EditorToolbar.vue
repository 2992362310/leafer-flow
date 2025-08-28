<script setup lang="ts">
import { ref } from 'vue'

const emits = defineEmits(['tool', 'operation'])

const selectedTool = ref('select')

function handleClick(tool: string) {
  emits('tool', tool)
  changeTool(tool)
}

function changeTool(tool: string) {
  selectedTool.value = tool
}

defineExpose({
  selectedTool,
  changeTool,
})
</script>

<template>
  <!-- 选择工具 -->
  <button
    @click.prevent="handleClick('select')"
    :class="{ 'btn-active': selectedTool === 'select' }"
    class="btn btn-sm join-item"
    title="选择"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122"
      />
    </svg>
    选择
  </button>

  <!-- 矩形工具 -->
  <button
    @click.prevent="handleClick('draw_rect')"
    :class="{ 'btn-active': selectedTool === 'draw_rect' }"
    class="btn btn-sm join-item"
    title="绘制矩形"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16v12H4z" />
    </svg>
    矩形
  </button>

  <!-- 箭头工具 -->
  <button
    @click.prevent="handleClick('draw_arrow')"
    :class="{ 'btn-active': selectedTool === 'draw_arrow' }"
    class="btn btn-sm join-item"
    title="绘制箭头"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
    箭头
  </button>
</template>
