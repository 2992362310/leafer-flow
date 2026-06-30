<script setup lang="ts">
import { computed } from "vue";
import type { Editor } from "@/editor";
import { editorPageComponentRegistry } from "@/views/editor-page/editor-page.component-registry";
import type { LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const {
  CanvasSearch,
  HistoryPanel,
  ShortcutHelp,
  PluginMarketDrawer,
  AgentChatPanel,
  MinimapPanel,
  MultiLayerPanel,
  DiagramLintPanel,
} = editorPageComponentRegistry;

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const overlayState = computed(() => ({
  searchOpen: props.state.searchOpen.value,
  historyOpen: props.state.historyOpen.value,
  pluginMarketOpen: props.state.pluginMarketOpen.value,
  agentOpen: props.state.agentOpen.value,
  minimapOpen: props.state.minimapOpen.value,
  multiLayerOpen: props.state.multiLayerOpen.value,
  diagramLintOpen: props.state.diagramLintOpen.value,
}));

const diagramLintIssues = computed<LintIssue[]>(() => props.state.diagramLintIssues.value);
const diagramLintGeneratedAt = computed(() => props.state.diagramLintGeneratedAt.value);

function closeSearch() {
  props.state.searchOpen.value = false;
}

function closeHistory() {
  props.state.historyOpen.value = false;
}

function closePluginMarketDrawer() {
  props.state.pluginMarketOpen.value = false;
}

function handlePluginMarketChanged() {
  window.dispatchEvent(new CustomEvent("leafer-flow:plugin-market-changed"));
}

function closeDiagramLint() {
  props.state.diagramLintOpen.value = false;
}
</script>

<template>
  <ShortcutHelp />

  <CanvasSearch v-if="editor" :editor="editor" :open="overlayState.searchOpen" @close="closeSearch" />

  <HistoryPanel v-if="editor" :editor="editor" :open="overlayState.historyOpen" @close="closeHistory" />

  <PluginMarketDrawer :editor="editor" :open="overlayState.pluginMarketOpen" @close="closePluginMarketDrawer"
    @changed="handlePluginMarketChanged" />

  <AgentChatPanel v-if="editor && overlayState.agentOpen" :editor="editor" />
  <MinimapPanel v-if="editor && overlayState.minimapOpen" :editor="editor" />
  <MultiLayerPanel v-if="editor && overlayState.multiLayerOpen" :editor="editor" />

  <DiagramLintPanel :open="overlayState.diagramLintOpen" :editor="editor" :issues="diagramLintIssues"
    :generated-at="diagramLintGeneratedAt" @close="closeDiagramLint" />
</template>
