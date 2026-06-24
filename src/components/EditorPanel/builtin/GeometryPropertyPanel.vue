<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import GeometryPanel from "@/components/EditorPanel/GeometryPanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <GeometryPanel
    :x="panelState.x.value"
    :y="panelState.y.value"
    :width="panelState.width.value"
    :height="panelState.height.value"
    :lock-aspect-ratio="panelState.lockAspectRatio.value"
    :show-position="!panelState.isMultiSelection.value"
    :show-size="!panelState.selectedConnector.value && !panelState.isMultiSelection.value"
    @update-x="panelState.updateX"
    @update-y="panelState.updateY"
    @update-width="panelState.updateWidth"
    @update-height="panelState.updateHeight"
    @update-lock-aspect-ratio="panelState.updateLockAspectRatio"
  />
</template>
