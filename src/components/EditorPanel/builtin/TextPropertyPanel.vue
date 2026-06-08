<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import TextPropertyPanel from "@/components/EditorPanel/TextPropertyPanel.vue";

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <TextPropertyPanel
    :text-content="panelState.textContent.value"
    :font-size="panelState.fontSize.value"
    :text-color="panelState.textColor.value"
    :show-content="!panelState.isMultiSelection.value"
    :show-connector-label-presets="panelState.selectedConnectorLabel.value && !panelState.isMultiSelection.value"
    @update-text="panelState.updateText"
    @update-font-size="panelState.updateFontSize"
    @update-text-color="panelState.updateTextColor"
    @apply-text-preset="panelState.applyTextPreset"
  />
</template>
