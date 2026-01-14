<script setup lang="ts">
import Icon from './Icon.vue'

const emits = defineEmits(['action'])

function handleClick(action: string) {
  emits('action', action)
}
</script>

<template>
  <div class="join shadow-sm border border-base-200">
    <!-- 撤销按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="撤销 (Ctrl+Z)">
      <button @click="handleClick('undo')" class="btn btn-sm join-item relative">
        <Icon name="undo" class="h-4 w-4" />
      </button>
    </div>

    <!-- 重做按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="重做 (Ctrl+Shift+Z)">
      <button @click="handleClick('redo')" class="btn btn-sm join-item relative">
        <Icon name="redo" class="h-4 w-4" />
      </button>
    </div>

    <!-- 清空按钮 - 单独样式 -->
     <div class="tooltip tooltip-bottom" data-tip="清空画布">
      <button @click="handleClick('clearCanvas')" class="btn btn-sm btn-error join-item bg-red-100 hover:bg-red-200 border-none text-red-600">
        <Icon name="clear" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
