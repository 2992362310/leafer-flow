<script setup lang="ts">
import { computed } from "vue";
import type { Editor } from "@/editor";
import ShortcutHelp from "@/components/ShortcutHelp.vue";
import { resolveOverlayPanelDefs, type OverlayPanelContext } from "@/views/editor-page";
import { useInjectedPanelVisibility } from "@/views/editor-page";
import type { PageState } from "@/views/editor-page";

const props = defineProps<{
  editor: Editor | undefined;
  state: PageState;
}>();

const visibility = useInjectedPanelVisibility();

const overlayPanelDefs = computed(() => resolveOverlayPanelDefs(props.editor));

const panelContext = computed<OverlayPanelContext>(() => ({
  editor: props.editor,
  visibility,
  diagramLintIssues: props.state.diagramLintIssues.value,
  diagramLintGeneratedAt: props.state.diagramLintGeneratedAt.value,
  onPluginMarketChanged: () => {
    window.dispatchEvent(new CustomEvent("leafer-flow:plugin-market-changed"));
  },
}));
</script>

<template>
  <ShortcutHelp />

  <template v-for="def in overlayPanelDefs" :key="def.id">
    <component
      :is="def.component"
      v-if="def.shouldMount(panelContext)"
      v-bind="def.getBindings(panelContext)"
      v-on="def.getListeners?.(panelContext) ?? {}"
    />
  </template>
</template>
