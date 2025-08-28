<script setup lang="ts">
const emits = defineEmits(['action'])

function handleClick(action: string) {
  emits('action', action)
}
</script>

<template>
  <!-- 撤销按钮 -->
  <button @click="handleClick('undo')" class="btn btn-sm join-item" title="撤销">
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
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  </button>

  <!-- 重做按钮 -->
  <button @click="handleClick('redo')" class="btn btn-sm join-item" title="重做">
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
        d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
      />
    </svg>
  </button>

  <!-- 清空按钮 -->
  <button
    @click="handleClick('clearCanvas')"
    class="btn btn-sm btn-error join-item"
    title="清空画布"
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  </button>
</template>
