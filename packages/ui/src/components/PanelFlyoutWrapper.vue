<script setup lang="ts">
import { inject } from "vue";
import { usePanelDock, type DockPanelId } from "../composables/usePanelDock";
import type { IconName } from "../assets/icons";
import { PANEL_VISIBILITY_KEY } from "../context/panel-visibility";

const props = withDefaults(
  defineProps<{
    panelId: DockPanelId;
    title: string;
    icon: IconName;
    width?: number;
  }>(),
  { width: 288 },
);

const { undockPanel } = usePanelDock();
const panelVisibility = inject(PANEL_VISIBILITY_KEY, null);

function handleUndock() {
  const id = props.panelId;
  undockPanel(id);
  // Restore float visibility for page-managed panels (docked toggles never set float open).
  if (panelVisibility?.has(id)) {
    panelVisibility.open(id);
  }
}
</script>

<template>
  <div
    class="fixed z-40 flex flex-col rounded-2xl border border-base-200/80 bg-base-100/95 shadow-xl backdrop-blur-sm overflow-hidden"
    :style="{ width: props.width + 'px', right: '3.5rem', top: '4rem', maxHeight: 'calc(100vh - 5rem)' }" @click.stop>
    <div class="flex shrink-0 items-center justify-between border-b border-base-200/80 px-4 py-2.5">
      <div class="flex items-center gap-2">
        <Icon :name="props.icon" class="h-4 w-4 text-base-content/60" />
        <span class="text-sm font-semibold">{{ props.title }}</span>
      </div>
      <button class="btn btn-ghost btn-xs gap-1" title="移出槽位，恢复浮动" @click="handleUndock">
        <Icon name="arrow-up" class="h-3 w-3 -rotate-90" />
        移出
      </button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
