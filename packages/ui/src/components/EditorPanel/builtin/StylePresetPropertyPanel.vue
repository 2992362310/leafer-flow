<script setup lang="ts">
import type { EditorPanelState } from "../../../composables/useEditorPanelState";
import { stylePresets } from "@leafer-flow/core/core/style-presets";
import StylePresetPanel from "../StylePresetPanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <StylePresetPanel :presets="stylePresets" @apply="panelState.handleStylePreset" />
</template>
