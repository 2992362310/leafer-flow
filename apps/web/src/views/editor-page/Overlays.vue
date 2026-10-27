<script setup lang="ts">
import { computed } from "vue";
import type { Editor } from "@leafer-flow/core";
import type { OverlayPanelContribution } from "@leafer-flow/core/api/overlay-panel";
import { resolveOverlayPanelDefs, useInjectedPanelVisibility, type OverlayPanelContext, type PageState } from "./lib";

const props = defineProps<{
  editor: Editor | undefined;
  state: PageState;
  panels: OverlayPanelContribution[];
}>();

const visibility = useInjectedPanelVisibility();

const overlayPanelDefs = computed(() => resolveOverlayPanelDefs(props.panels));

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
  <template v-for="def in overlayPanelDefs" :key="def.id">
    <component :is="def.component" v-if="def.shouldMount(panelContext)" v-bind="def.getBindings(panelContext)"
      v-on="def.getListeners?.(panelContext) ?? {}" />
  </template>
</template>
