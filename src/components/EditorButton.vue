<script setup lang="ts">
import { computed } from "vue";
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";

const props = withDefaults(
  defineProps<{
    groups: ActionButtonGroupContribution[];
    columns?: number;
    /** Highlight toggle buttons whose panelId is in this set. */
    activePanelIds?: ReadonlySet<string> | readonly string[];
    tooltipPlacement?: "top" | "bottom";
  }>(),
  {
    tooltipPlacement: "bottom",
  },
);

const emits = defineEmits<{
  action: [action: string];
}>();

function handleClick(action: string) {
  emits("action", action);
}

const activeIdSet = computed(() => {
  const raw = props.activePanelIds;
  if (!raw) return new Set<string>();
  return raw instanceof Set ? raw : new Set(raw);
});

function isItemActive(panelId?: string) {
  return Boolean(panelId && activeIdSet.value.has(panelId));
}

const tooltipClass = computed(() =>
  props.tooltipPlacement === "top" ? "tooltip tooltip-top" : "tooltip tooltip-bottom",
);

const useGridLayout = computed(() => typeof props.columns === "number" && props.columns > 0);

const containerClass = computed(() => {
  if (useGridLayout.value) return "grid items-start gap-2.5";
  return "flex flex-wrap items-start gap-2.5";
});

const containerStyle = computed<Record<string, string> | undefined>(() => {
  if (!useGridLayout.value || !props.columns) return undefined;
  return {
    gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
  };
});
</script>

<template>
  <div :class="containerClass" :style="containerStyle">
    <template v-for="group in props.groups" :key="group.id">
      <div
        v-for="item in group.items"
        :key="item.id"
        :class="tooltipClass"
        :data-tip="item.label"
      >
        <button
          @click="handleClick(item.command)"
          class="btn btn-sm h-10 w-10 px-0"
          :class="
            item.danger
              ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
              : isItemActive(item.panelId)
                ? 'btn-primary'
                : undefined
          "
        >
          <Icon :name="item.icon ?? group.icon" class="h-5 w-5" />
        </button>
      </div>
    </template>
  </div>
</template>
