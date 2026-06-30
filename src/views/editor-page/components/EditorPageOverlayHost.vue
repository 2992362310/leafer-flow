<script setup lang="ts">
import { computed } from "vue";
import type { Editor } from "@/editor";
import { editorPageComponentRegistry } from "@/views/editor-page/editor-page.component-registry";
import type { LintFixSummary, LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";
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
const diagramLintFixSummary = computed<LintFixSummary | null>(() => props.state.diagramLintFixSummary.value);

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

async function executeLintCommand(command: string) {
  if (!props.editor) return undefined;
  const result = await props.editor.commands.execute(command) as {
    success: boolean;
    message: string;
    summary?: LintFixSummary;
    nextIssueId?: string;
  };
  if (result.summary) {
    props.state.diagramLintFixSummary.value = result.summary;
  }
  return result;
}

async function handleLintFocus(issueId: string) {
  await executeLintCommand(`diagramLint.focus.issue:${encodeURIComponent(issueId)}`);
}

async function handleLintFix(issueId: string) {
  await executeLintCommand(`diagramLint.fix.issue:${encodeURIComponent(issueId)}`);
}

async function handleLintFixNext(issueId: string) {
  const result = await executeLintCommand(`diagramLint.fix.next:${encodeURIComponent(issueId)}`);
  if (result?.success && result.nextIssueId) {
    await handleLintFocus(result.nextIssueId);
  }
}

async function handleLintFixPipeline() {
  await executeLintCommand("diagramLint.fix.pipeline");
}

async function handleLintFixAll() {
  await executeLintCommand("diagramLint.fix.all");
}

async function handleLintFixRule(ruleId: string) {
  await executeLintCommand(`diagramLint.fix.rule:${encodeURIComponent(ruleId)}`);
}

async function handleLintFocusPathNode(payload: { issueId: string; nodeId: string }) {
  await executeLintCommand(
    `diagramLint.focus.pathNode:${encodeURIComponent(payload.issueId)}:${encodeURIComponent(payload.nodeId)}`,
  );
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

  <DiagramLintPanel :open="overlayState.diagramLintOpen" :issues="diagramLintIssues"
    :generated-at="diagramLintGeneratedAt" :fix-summary="diagramLintFixSummary" @close="closeDiagramLint"
    @focus-issue="handleLintFocus" @fix-issue="handleLintFix" @fix-next="handleLintFixNext"
    @fix-pipeline="handleLintFixPipeline" @fix-all="handleLintFixAll" @fix-rule="handleLintFixRule"
    @focus-path-node="handleLintFocusPathNode" />
</template>
