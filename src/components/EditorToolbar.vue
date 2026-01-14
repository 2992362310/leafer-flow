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
    'relative', // Ensure relative positioning for badge
    { 'btn-active': selectedTool.value === tool }
  ]
}

defineExpose({
  selectedTool,
  changeTool,
})
</script>

<template>
  <div class="join shadow-sm border border-base-200">
    <!-- 选择工具 -->
    <div class="tooltip tooltip-bottom" data-tip="选择 (V)">
      <button @click.prevent="handleClick('select')" :class="getButtonClass('select')">
        <Icon name="select" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">V</span>
      </button>
    </div>

    <!-- 矩形工具 -->
    <div class="tooltip tooltip-bottom" data-tip="矩形 (R)">
      <button @click.prevent="handleClick('draw_rect')" :class="getButtonClass('draw_rect')">
        <Icon name="draw_rect" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">R</span>
      </button>
    </div>

    <!-- 圆形工具 -->
    <div class="tooltip tooltip-bottom" data-tip="圆形 (C)">
      <button @click.prevent="handleClick('draw_circle')" :class="getButtonClass('draw_circle')">
        <Icon name="draw_circle" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">C</span>
      </button>
    </div>

    <!-- 菱形工具 -->
    <div class="tooltip tooltip-bottom" data-tip="菱形 (D)">
      <button @click.prevent="handleClick('draw_diamond')" :class="getButtonClass('draw_diamond')">
        <Icon name="draw_diamond" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">D</span>
      </button>
    </div>

    <!-- 箭头工具 -->
    <div class="tooltip tooltip-bottom" data-tip="箭头 (A)">
      <button @click.prevent="handleClick('draw_arrow')" :class="getButtonClass('draw_arrow')">
        <Icon name="draw_arrow" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">A</span>
      </button>
    </div>

    <!-- 文本工具 -->
    <div class="tooltip tooltip-bottom" data-tip="文本 (T)">
      <button @click.prevent="handleClick('draw_text')" :class="getButtonClass('draw_text')">
        <Icon name="draw_text" class="h-4 w-4" />
        <span class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">T</span>
      </button>
    </div>
  </div>
</template>