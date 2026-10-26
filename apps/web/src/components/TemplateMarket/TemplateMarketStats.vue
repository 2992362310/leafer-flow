<script setup lang="ts">
defineProps<{
  total: number;
  free: number;
  premium: number;
  purchased: number;
  filtered: number;
}>();
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <div class="rounded-lg bg-base-200/60 px-3 py-2">
      <div class="text-[11px] text-base-content/50">全部</div>
      <div class="text-lg font-semibold leading-tight">{{ total }}</div>
    </div>
    <div class="rounded-lg bg-success/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">免费</div>
      <div class="text-lg font-semibold leading-tight text-success">{{ free }}</div>
    </div>
    <div class="rounded-lg bg-warning/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">Pro</div>
      <div class="text-lg font-semibold leading-tight text-warning">{{ premium }}</div>
    </div>
    <div class="rounded-lg bg-primary/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">已购</div>
      <div class="text-lg font-semibold leading-tight text-primary">{{ purchased }}</div>
    </div>
  </div>

  <div class="text-[11px] text-base-content/50">
    当前显示 <span class="font-medium text-base-content/70">{{ filtered }}</span> / {{ total }} 个模板
  </div>
</template>
