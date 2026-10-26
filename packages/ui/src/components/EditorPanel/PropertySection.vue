<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <div>
    <div v-if="title" class="divider my-1">{{ title }}</div>
    <slot />
  </div>
</template>
