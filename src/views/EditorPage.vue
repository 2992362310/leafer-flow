<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Editor, getZoomPercent } from "@/editor";
import { TOOL_NAME, ACTION_NAME } from "@/editor/constants";
import { canUseTemplateAction } from "@/editor/plugins/market/plugin-market-service";
import EditorLog from "@/components/EditorLog.vue";
import EditorPanel from "@/components/EditorPanel.vue";
import EditorTopBar from "@/components/EditorTopBar.vue";
import LayerPanel from "@/components/LayerTree/LayerPanel.vue";
import StatusBar from "@/components/StatusBar.vue";
import ViewControls from "@/components/ViewControls.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import SelectionMarquee from "@/components/SelectionMarquee.vue";
import ShapeLibrary from "@/components/ShapeLibrary.vue";
import { useRuntimeContributions } from "@/composables/useRuntimeContributions";
import { useSelectionMarquee } from "@/composables/useSelectionMarquee";
import { useShapeDrop } from "@/composables/useShapeDrop";
import { useEditorCommands } from "@/composables/useEditorCommands";
import { useEditorAppInit } from "@/composables/useEditorAppInit";
import type { DiagramLintUpdatedEventDetail, LintFixSummary, LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";

const CanvasSearch = defineAsyncComponent(() => import("@/components/CanvasSearch.vue"));
const HistoryPanel = defineAsyncComponent(() => import("@/components/HistoryPanel.vue"));
const ShortcutHelp = defineAsyncComponent(() => import("@/components/ShortcutHelp.vue"));
const PluginMarketDrawer = defineAsyncComponent(() => import("@/components/PluginMarket/PluginMarketDrawer.vue"));
const AgentChatPanel = defineAsyncComponent(() => import("@/editor/builtin/plugins/agent/AgentChatPanel.vue"));
const MinimapPanel = defineAsyncComponent(() => import("@/editor/builtin/plugins/minimap/MinimapPanel.vue"));
const MultiLayerPanel = defineAsyncComponent(() => import("@/editor/builtin/plugins/multi-layer/LayerPanel.vue"));
const DiagramLintPanel = defineAsyncComponent(() => import("@/editor/builtin/plugins/diagram-lint/DiagramLintPanel.vue"));

const route = useRoute();
const router = useRouter();
const editorRef = useTemplateRef("editorRef");
const logRef = useTemplateRef("logRef");
const editor = shallowRef<Editor>();

const elementCount = ref(0);
const zoomPercent = ref(100);
const activeTool = ref<string>(TOOL_NAME.SELECT);
const pluginMarketOpen = ref(false);
const agentOpen = ref(false);
const minimapOpen = ref(true);
const multiLayerOpen = ref(false);
const searchOpen = ref(false);
const historyOpen = ref(false);
const shortcutHelpOpen = ref(false);
const diagramLintOpen = ref(false);
const diagramLintIssues = ref<LintIssue[]>([]);
const diagramLintGeneratedAt = ref<number>(Date.now());
const diagramLintFixSummary = ref<LintFixSummary | null>(null);
const cleanupCallbacks: Array<() => void> = [];

const {
  shapeLibraryGroups: runtimeShapeLibraryGroups,
  toolbarGroups: runtimeToolbarGroups,
  actionButtonGroups: runtimeActionButtonGroups,
  viewControls: runtimeViewControls,
  toolLabels: runtimeToolLabels,
  toolShortcuts: runtimeToolShortcuts,
  refresh: refreshRuntimeToolContributions,
  findShapeItem,
} = useRuntimeContributions();

const { handleTool, handleAction, resetToSelectTool } = useEditorCommands({
  editor,
  logRef,
  activeTool,
  toolShortcuts: runtimeToolShortcuts,
  refreshEditorStats,
});

const { marquee, bind: bindSelectionMarquee } = useSelectionMarquee({
  editor,
  selectedTool: activeTool,
  addCleanup,
  onLog: (message, level) => logRef.value?.addLog({ message, level }),
});

const { bind: bindShapeDrop } = useShapeDrop({
  editor,
  editorElement: editorRef,
  addCleanup,
  onCreated: () => {
    if (editor.value) refreshEditorStats(editor.value);
  },
  onLog: (message, level) => logRef.value?.addLog({ message, level }),
});

const { initializeApp } = useEditorAppInit({
  editor,
  editorElement: editorRef,
  logRef,
  refreshRuntimeToolContributions,
  bindSelectionMarquee,
  bindShapeDrop,
  refreshEditorStats,
});

onMounted(() => {
  initializeApp();

  const templateAction = route.query.template as string | undefined;
  if (templateAction) {
    queueMicrotask(async () => {
      const currentEditor = editor.value;
      if (!currentEditor) return;
      if (!canUseTemplateAction(templateAction)) {
        router.replace({ path: "/template-market" });
        logRef.value?.addLog({ message: "该模板尚未购买", level: "warning" });
        return;
      }
      await currentEditor.commands.execute(templateAction);
      router.replace({ path: "/" });
      logRef.value?.addLog({ message: "模板已插入", level: "success" });
    });
  }

  const handleToggleAgent = () => {
    agentOpen.value = !agentOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-agent", handleToggleAgent);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-agent", handleToggleAgent);
  });

  const handleToggleMinimap = () => {
    minimapOpen.value = !minimapOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-minimap", handleToggleMinimap);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-minimap", handleToggleMinimap);
  });

  const handleToggleLayerPanel = () => {
    multiLayerOpen.value = !multiLayerOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-layer-panel", handleToggleLayerPanel);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-layer-panel", handleToggleLayerPanel);
  });

  const handleToggleSearch = () => {
    searchOpen.value = !searchOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-search", handleToggleSearch);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-search", handleToggleSearch);
  });

  const handleToggleHistory = () => {
    historyOpen.value = !historyOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-history", handleToggleHistory);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-history", handleToggleHistory);
  });

  const handleToggleShortcutHelp = () => {
    shortcutHelpOpen.value = !shortcutHelpOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-shortcut-help", handleToggleShortcutHelp);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-shortcut-help", handleToggleShortcutHelp);
  });

  const handleLintUpdated = (event: Event) => {
    const customEvent = event as CustomEvent<DiagramLintUpdatedEventDetail>;
    diagramLintIssues.value = customEvent.detail?.issues ?? [];
    diagramLintGeneratedAt.value = customEvent.detail?.generatedAt ?? Date.now();
    diagramLintOpen.value = true;
  };
  window.addEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
  });

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    const { ctrlKey, metaKey, shiftKey, key } = e;
    const isCmd = ctrlKey || metaKey;

    if (isCmd && shiftKey && key.toLowerCase() === "a") {
      e.preventDefault();
      agentOpen.value = !agentOpen.value;
    }
  };
  window.addEventListener("keydown", handleKeydown);
  addCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
});

onUnmounted(() => {
  cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
});

function refreshEditorStats(currentEditor: Editor) {
  elementCount.value = currentEditor.app.tree.children.length;
  zoomPercent.value = getZoomPercent(currentEditor);
}

function addCleanup(cleanup: () => void) {
  cleanupCallbacks.push(cleanup);
}

function handleLibraryTool(tool: string) {
  const item = findShapeItem(tool);
  handleTool({ command: tool, pre: activeTool.value });
  if (item) {
    logRef.value?.addLog({ message: `已选择图形：${item.label}`, level: "info" });
  }
}

function handlePluginMarketChanged() {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  refreshRuntimeToolContributions(currentEditor);
  resetToSelectTool();
  logRef.value?.addLog({ message: "插件状态已更新", level: "success" });
}

function openPluginMarketPage() {
  router.push("/plugin-market");
}

function openTemplateMarketPage() {
  router.push("/template-market");
}

async function handleLintFocus(issueId: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute(
    `diagramLint.focus.issue:${encodeURIComponent(issueId)}`,
  );

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "info" : "warning",
  });
}

async function handleLintFix(issueId: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute(
    `diagramLint.fix.issue:${encodeURIComponent(issueId)}`,
  ) as { success: boolean; message: string; summary?: LintFixSummary };

  if (result.summary) diagramLintFixSummary.value = result.summary;

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : "warning",
  });
}

async function handleLintFixNext(issueId: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute(
    `diagramLint.fix.next:${encodeURIComponent(issueId)}`,
  ) as { success: boolean; message: string; nextIssueId?: string; summary?: LintFixSummary };

  if (result.summary) diagramLintFixSummary.value = result.summary;

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : "warning",
  });

  if (result.success && result.nextIssueId) {
    await handleLintFocus(result.nextIssueId);
  }
}

async function handleLintFixPipeline() {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute("diagramLint.fix.pipeline")
    as { success: boolean; message: string; summary?: LintFixSummary };

  if (result.summary) diagramLintFixSummary.value = result.summary;

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : "warning",
  });
}

async function handleLintFixAll() {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute("diagramLint.fix.all")
    as { success: boolean; message: string; summary?: LintFixSummary };

  if (result.summary) diagramLintFixSummary.value = result.summary;

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : "warning",
  });
}

async function handleLintFixRule(ruleId: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute(
    `diagramLint.fix.rule:${encodeURIComponent(ruleId)}`,
  ) as { success: boolean; message: string; summary?: LintFixSummary };

  if (result.summary) diagramLintFixSummary.value = result.summary;

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : "warning",
  });
}

async function handleLintFocusPathNode(payload: { issueId: string; nodeId: string }) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const result = await currentEditor.commands.execute(
    `diagramLint.focus.pathNode:${encodeURIComponent(payload.issueId)}:${encodeURIComponent(payload.nodeId)}`,
  );

  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "info" : "warning",
  });
}
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>
  <SelectionMarquee :active="marquee.active" :x="marquee.x" :y="marquee.y" :width="marquee.width"
    :height="marquee.height" />
  <CanvasSearch v-if="editor" :editor="editor" :open="searchOpen" @close="searchOpen = false" />

  <ShapeLibrary :active-tool="activeTool" :groups="runtimeShapeLibraryGroups" @tool="handleLibraryTool" />

  <EditorTopBar
    v-model:selected-tool="activeTool"
    :toolbar-groups="runtimeToolbarGroups"
    :action-button-groups="runtimeActionButtonGroups"
    @tool="handleTool"
    @action="handleAction"
    @open-plugin-market="openPluginMarketPage"
    @open-template-market="openTemplateMarketPage"
  />

  <LayerPanel :editor="editor" />
  <EditorPanel :editor="editor" class="z-10" />

  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar :selected-tool="activeTool" :tool-labels="runtimeToolLabels" :element-count="elementCount" />
  </div>

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" :controls="runtimeViewControls" @action="handleAction" />
  </div>

  <EditorLog class="absolute bottom-2 right-4" ref="logRef" />
  <HistoryPanel v-if="editor" :editor="editor" :open="historyOpen" @close="historyOpen = false" />
  <ShortcutHelp :open="shortcutHelpOpen" @close="shortcutHelpOpen = false" />
  <ContextMenu :editor="editor" @action="handleAction" />
  <PluginMarketDrawer :editor="editor" :open="pluginMarketOpen" @close="pluginMarketOpen = false"
    @changed="handlePluginMarketChanged" />
  <AgentChatPanel v-if="editor && agentOpen" :editor="editor" />
  <MinimapPanel v-if="editor && minimapOpen" :editor="editor" />
  <MultiLayerPanel v-if="editor && multiLayerOpen" :editor="editor" />
  <DiagramLintPanel
    :open="diagramLintOpen"
    :issues="diagramLintIssues"
    :generated-at="diagramLintGeneratedAt"
    :fix-summary="diagramLintFixSummary"
    @close="diagramLintOpen = false"
    @focus-issue="handleLintFocus"
    @fix-issue="handleLintFix"
    @fix-next="handleLintFixNext"
    @fix-pipeline="handleLintFixPipeline"
    @fix-all="handleLintFixAll"
    @fix-rule="handleLintFixRule"
    @focus-path-node="handleLintFocusPathNode"
  />
</template>
