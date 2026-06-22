<script setup lang="ts">
import type { EditorPanelState } from "@/composables/useEditorPanelState";
import { stylePresets } from "@/editor/core/style-presets";
import StylePresetPanel from "@/components/EditorPanel/StylePresetPanel.vue";

defineOptions({ inheritAttrs: false });

defineProps<{
  panelState: EditorPanelState;
}>();
</script>

<template>
  <StylePresetPanel :presets="stylePresets" @apply="panelState.handleStylePreset" />
</template>
