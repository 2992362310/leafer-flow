<script setup lang="ts">
import Icon from './Icon.vue'

const emits = defineEmits(['action'])

function handleClick(action: string) {
  emits('action', action)
}
</script>

<template>
  <div class="join">
    <!-- 撤销按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="撤销 (Ctrl+Z)">
      <button @click="handleClick('undo')" class="btn btn-sm join-item relative">
        <Icon name="undo" class="h-5 w-5" />
      </button>
    </div>

    <!-- 重做按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="重做 (Ctrl+Shift+Z)">
      <button @click="handleClick('redo')" class="btn btn-sm join-item relative">
        <Icon name="redo" class="h-5 w-5" />
      </button>
    </div>

    <!-- 组合按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="组合 (Ctrl+G)">
      <button @click="handleClick('group')" class="btn btn-sm join-item relative">
        <Icon name="group" class="h-5 w-5" />
      </button>
    </div>

    <!-- 解组按钮 -->
    <div class="tooltip tooltip-bottom" data-tip="取消组合 (Ctrl+Shift+G)">
      <button @click="handleClick('ungroup')" class="btn btn-sm join-item relative">
        <Icon name="ungroup" class="h-5 w-5" />
      </button>
    </div>

    <!-- 清空按钮 - 单独样式 -->
    <div class="tooltip tooltip-bottom" data-tip="清空画布">
      <button
        @click="handleClick('clearCanvas')"
        class="btn btn-sm btn-error join-item bg-red-50 hover:bg-red-100 border-none text-red-500"
      >
        <Icon name="clear" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>
