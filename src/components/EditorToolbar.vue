<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'

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
  <button @click.prevent="handleClick('select')" :class="{ 'btn-active': selectedTool === 'select' }"
    class="btn btn-sm join-item">
    <Icon name="select" class="h-4 w-4" />
    选择
  </button>

  <!-- 矩形工具 -->
  <button @click.prevent="handleClick('draw_rect')" :class="{ 'btn-active': selectedTool === 'draw_rect' }"
    class="btn btn-sm join-item">
    <Icon name="rectangle" class="h-4 w-4" />
    矩形
  </button>

  <!-- 圆形工具 -->
  <button @click.prevent="handleClick('draw_circle')" :class="{ 'btn-active': selectedTool === 'draw_circle' }"
    class="btn btn-sm join-item">
    <Icon name="circle" class="h-4 w-4" />
    圆形
  </button>

  <!-- 菱形工具 -->
  <button @click.prevent="handleClick('draw_diamond')" :class="{ 'btn-active': selectedTool === 'draw_diamond' }"
    class="btn btn-sm join-item">
    <Icon name="diamond" class="h-4 w-4" />
    菱形
  </button>

  <!-- 箭头工具 -->
  <button @click.prevent="handleClick('draw_arrow')" :class="{ 'btn-active': selectedTool === 'draw_arrow' }"
    class="btn btn-sm join-item">
    <Icon name="arrow" class="h-4 w-4" />
    箭头
  </button>

  <!-- 文本工具 -->
  <button @click.prevent="handleClick('draw_text')" :class="{ 'btn-active': selectedTool === 'draw_text' }"
    class="btn btn-sm join-item">
    <Icon name="text" class="h-4 w-4" />
    文本
  </button>
</template>