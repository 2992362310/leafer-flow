<script setup lang="ts">
import type { ViewControlContribution } from "@/editor/api/view-control";

defineProps<{
  zoomPercent: number;
  controls: ViewControlContribution[];
}>();

const emits = defineEmits<{
  action: [action: string];
}>();

function handleClick(action: string) {
  emits("action", action);
}
</script>

<template>
  <div
    v-if="controls.length"
    class="join bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-lg"
  >
    <div
      v-for="control in controls"
      :key="control.id"
      class="tooltip tooltip-top"
      :data-tip="control.label"
    >
      <button
        @click="handleClick(control.command)"
        class="btn btn-sm join-item"
        :class="{ 'min-w-16 text-xs tabular-nums': control.zoomLabel }"
      >
        <template v-if="control.zoomLabel">{{ zoomPercent }}%</template>
        <Icon v-else-if="control.icon" :name="control.icon" class="h-4 w-4" />
        <span v-else class="text-lg leading-none">{{ control.text }}</span>
      </button>
    </div>
  </div>
</template>
