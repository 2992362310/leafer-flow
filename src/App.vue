<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import { type Editor, getZoomPercent } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import EditorLog from "@/components/EditorLog.vue";
import EditorPanel from "@/components/EditorPanel.vue";
import EditorTopBar from "@/components/EditorTopBar.vue";
import LayerPanel from "@/components/LayerTree/LayerPanel.vue";
import StatusBar from "@/components/StatusBar.vue";
import ViewControls from "@/components/ViewControls.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import SelectionMarquee from "@/components/SelectionMarquee.vue";
import ShapeLibrary from "@/components/ShapeLibrary.vue";
import PluginMarketDrawer from "@/components/PluginMarket/PluginMarketDrawer.vue";
import AgentChatPanel from "@/editor/builtin/plugins/agent/AgentChatPanel.vue";
import { useRuntimeContributions } from "@/composables/useRuntimeContributions";
import { useSelectionMarquee } from "@/composables/useSelectionMarquee";
import { useShapeDrop } from "@/composables/useShapeDrop";
import { useEditorCommands } from "@/composables/useEditorCommands";
import { useEditorAppInit } from "@/composables/useEditorAppInit";

const editorRef = useTemplateRef("editorRef");
const logRef = useTemplateRef("logRef");
const editor = shallowRef<Editor>();

const elementCount = ref(0);
const zoomPercent = ref(100);
const activeTool = ref<string>(TOOL_NAME.SELECT);
const pluginMarketOpen = ref(false);
const agentOpen = ref(false);
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

  // 监听 AI 助手切换事件
  const handleToggleAgent = () => {
    agentOpen.value = !agentOpen.value;
  };
  window.addEventListener("leafer-flow:toggle-agent", handleToggleAgent);
  addCleanup(() => {
    window.removeEventListener("leafer-flow:toggle-agent", handleToggleAgent);
  });

  // 监听快捷键 Ctrl+Shift+A 打开 AI 助手
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
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>
  <SelectionMarquee
    :active="marquee.active"
    :x="marquee.x"
    :y="marquee.y"
    :width="marquee.width"
    :height="marquee.height"
  />

  <ShapeLibrary
    :active-tool="activeTool"
    :groups="runtimeShapeLibraryGroups"
    @tool="handleLibraryTool"
  />

  <EditorTopBar
    v-model:selected-tool="activeTool"
    :toolbar-groups="runtimeToolbarGroups"
    :action-button-groups="runtimeActionButtonGroups"
    @tool="handleTool"
    @action="handleAction"
    @open-plugin-market="pluginMarketOpen = true"
  />

  <LayerPanel :editor="editor" />
  <EditorPanel :editor="editor" class="z-10" />

  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar
      :selected-tool="activeTool"
      :tool-labels="runtimeToolLabels"
      :element-count="elementCount"
    />
  </div>

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls
      :zoom-percent="zoomPercent"
      :controls="runtimeViewControls"
      @action="handleAction"
    />
  </div>

  <EditorLog class="absolute bottom-2 right-4" ref="logRef" />
  <ContextMenu :editor="editor" @action="handleAction" />
  <PluginMarketDrawer
    :editor="editor"
    :open="pluginMarketOpen"
    @close="pluginMarketOpen = false"
    @changed="handlePluginMarketChanged"
  />
  <AgentChatPanel
    v-if="editor && agentOpen"
    :editor="editor"
  />
</template>
