<script setup lang="ts">
const props = defineProps<{
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}>();
</script>

<template>
  <div
    v-if="active"
    class="absolute border border-primary bg-primary/10 pointer-events-none"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    }"
  />
</template>
