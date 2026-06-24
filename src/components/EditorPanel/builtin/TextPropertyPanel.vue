<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import TextPropertyPanel from "@/components/EditorPanel/TextPropertyPanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <TextPropertyPanel
    :text-content="panelState.textContent.value"
    :font-size="panelState.fontSize.value"
    :text-color="panelState.textColor.value"
    :font-weight="panelState.fontWeight.value"
    :font-style="panelState.fontStyle.value"
    :text-align="panelState.textAlign.value"
    :show-content="!panelState.isMultiSelection.value"
    :show-connector-label-presets="panelState.selectedConnectorLabel.value && !panelState.isMultiSelection.value"
    @update-text="panelState.updateText"
    @update-font-size="panelState.updateFontSize"
    @update-text-color="panelState.updateTextColor"
    @update-font-weight="panelState.updateFontWeight"
    @update-font-style="panelState.updateFontStyle"
    @update-text-align="panelState.updateTextAlign"
    @apply-text-preset="panelState.applyTextPreset"
  />
</template>
