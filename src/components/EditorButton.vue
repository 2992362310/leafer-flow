<script setup lang="ts">
import Icon from './Icon.vue'

const emits = defineEmits(['action'])

function handleClick(action: string) {
  emits('action', action)
}
</script>

<template>
  <!-- 撤销按钮 -->
  <button @click="handleClick('undo')" class="btn btn-sm join-item">
    <Icon name="undo" class="h-4 w-4" />
  </button>

  <!-- 重做按钮 -->
  <button @click="handleClick('redo')" class="btn btn-sm join-item">
    <Icon name="redo" class="h-4 w-4" />
  </button>

  <!-- 清空按钮 -->
  <button @click="handleClick('clearCanvas')" class="btn btn-sm btn-error join-item">
    <Icon name="clear" class="h-4 w-4" />
  </button>
</template>
