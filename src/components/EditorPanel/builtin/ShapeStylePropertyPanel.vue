<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import ShapeStylePanel from "@/components/EditorPanel/ShapeStylePanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <ShapeStylePanel
    :fill="panelState.fill.value"
    :stroke="panelState.stroke.value"
    :stroke-width="panelState.strokeWidth.value"
    :opacity="panelState.opacity.value"
    :corner-radius="panelState.cornerRadius.value"
    :show-colors="!panelState.selectedConnector.value"
    @update-fill="panelState.updateFill"
    @update-stroke="panelState.updateStroke"
    @update-stroke-width="panelState.updateStrokeWidth"
    @update-opacity="panelState.updateOpacity"
    @update-corner-radius="panelState.updateCornerRadius"
  />
</template>
