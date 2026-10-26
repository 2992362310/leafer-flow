<script setup lang="ts">
defineProps<{
  total: number;
  active: number;
  required: number;
  propertyPanel: number;
  filtered: number;
}>();
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <div class="rounded-lg bg-base-200/60 px-3 py-2">
      <div class="text-[11px] text-base-content/50">全部插件</div>
      <div class="text-lg font-semibold leading-tight">{{ total }}</div>
    </div>
    <div class="rounded-lg bg-success/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">已启用</div>
      <div class="text-lg font-semibold leading-tight text-success">{{ active }}</div>
    </div>
    <div class="rounded-lg bg-primary/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">必需</div>
      <div class="text-lg font-semibold leading-tight text-primary">{{ required }}</div>
    </div>
    <div class="rounded-lg bg-secondary/10 px-3 py-2">
      <div class="text-[11px] text-base-content/50">属性面板</div>
      <div class="text-lg font-semibold leading-tight text-secondary">{{ propertyPanel }}</div>
    </div>
  </div>

  <div class="text-[11px] text-base-content/50">
    当前显示 <span class="font-medium text-base-content/70">{{ filtered }}</span> /
    {{ total }} 个插件
  </div>
</template>
