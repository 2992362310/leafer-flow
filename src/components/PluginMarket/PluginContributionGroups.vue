<script setup lang="ts">
import type { PluginContributionGroupSummary } from "@/editor/plugins/market/plugin-market-service";

const props = withDefaults(
  defineProps<{
    groups: PluginContributionGroupSummary[];
    limit?: number;
    detailed?: boolean;
  }>(),
  {
    limit: 6,
    detailed: false,
  },
);

function previewLabels(labels: string[]) {
  return props.detailed ? labels : labels.slice(0, props.limit);
}

function hiddenLabelCount(labels: string[]) {
  return props.detailed ? 0 : Math.max(labels.length - props.limit, 0);
}
</script>

<template>
  <div v-if="groups.length" class="space-y-2">
    <div v-for="group in groups" :key="group.kind" class="space-y-1">
      <div class="text-[11px] font-medium text-base-content/60">
        {{ group.label }}<span v-if="detailed"> · {{ group.count }}</span>
      </div>

      <ul v-if="detailed" class="list-disc pl-4 text-xs text-base-content/60">
        <li v-for="label in group.items" :key="`${group.kind}-${label}`">
          {{ label }}
        </li>
      </ul>

      <div v-else class="flex flex-wrap gap-1">
        <span
          v-for="label in previewLabels(group.items)"
          :key="`${group.kind}-${label}`"
          class="badge badge-xs badge-outline"
        >
          {{ label }}
        </span>
        <span v-if="hiddenLabelCount(group.items)" class="badge badge-xs badge-ghost">
          +{{ hiddenLabelCount(group.items) }}
        </span>
      </div>
    </div>
  </div>
</template>
