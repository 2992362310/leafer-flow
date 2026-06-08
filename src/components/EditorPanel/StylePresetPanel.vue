<script setup lang="ts">
import type { StylePresetId } from "@/editor/core/style-presets";

defineProps<{
  presets: Array<{
    id: string;
    label: string;
    fill: string;
    stroke: string;
  }>;
}>();

const emit = defineEmits<{
  apply: [presetId: StylePresetId];
}>();
</script>

<template>
  <div class="mb-1">
    <div class="mb-1 text-xs font-semibold text-base-content/70">样式预设</div>
    <div class="grid grid-cols-2 gap-1">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="btn btn-xs justify-start gap-2"
        @click="emit('apply', preset.id as StylePresetId)"
      >
        <span
          class="h-3 w-3 rounded border"
          :style="{ backgroundColor: preset.fill, borderColor: preset.stroke }"
        ></span>
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>
