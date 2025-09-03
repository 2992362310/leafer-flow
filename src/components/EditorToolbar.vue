<script setup lang="ts">
import { ref, unref } from 'vue'
import Icon from './Icon.vue'

const emits = defineEmits(['tool', 'operation'])

const selectedTool = ref('select')

function handleClick(tool: string) {
  const evt = {
    command: tool,
    pre: unref(selectedTool),
  }
  emits('tool', evt)
  changeTool(tool)
}

function changeTool(tool: string) {
  selectedTool.value = tool
}

// 优化：创建一个计算按钮类名的函数
function getButtonClass(tool: string) {
  return [
    'btn',
    'btn-sm',
    'join-item',
    { 'btn-active': selectedTool.value === tool }
  ]
}

defineExpose({
  selectedTool,
  changeTool,
})
</script>

<template>
  <!-- 选择工具 -->
  <button @click.prevent="handleClick('select')" :class="getButtonClass('select')">
    <Icon name="select" class="h-4 w-4" />
    选择
  </button>

  <!-- 矩形工具 -->
  <button @click.prevent="handleClick('draw_rect')" :class="getButtonClass('draw_rect')">
    <Icon name="draw_rect" class="h-4 w-4" />
    矩形
  </button>

  <!-- 圆形工具 -->
  <button @click.prevent="handleClick('draw_circle')" :class="getButtonClass('draw_circle')">
    <Icon name="draw_circle" class="h-4 w-4" />
    圆形
  </button>

  <!-- 菱形工具 -->
  <button @click.prevent="handleClick('draw_diamond')" :class="getButtonClass('draw_diamond')">
    <Icon name="draw_diamond" class="h-4 w-4" />
    菱形
  </button>

  <!-- 箭头工具 -->
  <button @click.prevent="handleClick('draw_arrow')" :class="getButtonClass('draw_arrow')">
    <Icon name="draw_arrow" class="h-4 w-4" />
    箭头
  </button>

  <!-- 文本工具 -->
  <button @click.prevent="handleClick('draw_text')" :class="getButtonClass('draw_text')">
    <Icon name="draw_text" class="h-4 w-4" />
    文本
  </button>
</template>