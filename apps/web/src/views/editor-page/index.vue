<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import type { Editor } from "@leafer-flow/core";
import { providePanelDock } from "@leafer-flow/ui/composables";
import {
  EditorTopBar,
  EditorActionBar,
  EditorLog,
  EditorPanel,
  LayerPanel,
  PanelDockRail,
  StatusBar,
  ViewControls,
} from "@leafer-flow/ui";
import CanvasLayer from "./CanvasLayer.vue";
import Overlays from "./Overlays.vue";
import { providePanelVisibility, usePageSetup, usePageState, useTemplateRoute } from "./lib";

type LogLevel = "info" | "success" | "warning" | "error";

interface RuntimeLogApi {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

const editorRef = useTemplateRef("editorRef");
const logRef = useTemplateRef<RuntimeLogApi>("logRef");
const editor = shallowRef<Editor>();
const router = useRouter();

const state = usePageState();
const panelDock = providePanelDock();
const panelVisibility = providePanelVisibility(state, panelDock);
const { cleanupAll } = state;

const selectedTool = computed(() => state.activeTool.value);
const elementCount = computed(() => state.elementCount.value);
const layerPanelOpen = computed(() => panelVisibility.shouldShowFloat("layer-panel"));
const showLayerPanel = computed(() => panelVisibility.isMounted("layer-panel"));
const zoomPercent = computed(() => state.zoomPercent.value);
const viewControls = computed(() => {
  if (!editor.value) return [];
  return editor.value.viewControls.list();
});

const { initializeApp, bindEvents, runtime, pageCommands, overlayPanels } = usePageSetup({
  editor,
  editorElement: editorRef,
  logRef,
  state,
  panelVisibility,
  panelDock,
});

const toolLabels = computed(() => runtime.toolLabels.value);

const { handleTemplateFromRoute } = useTemplateRoute({ editor, logRef });

async function openMarket(kind: "plugin" | "template") {
  if (!editor.value) {
    await router.push(`/${kind}-market`);
    return;
  }
  await pageCommands.handleAction(kind === "plugin" ? "togglePluginMarket" : "toggleTemplateMarket");
}

onMounted(() => {
  void (async () => {
    try {
      if (!await initializeApp()) return;
      bindEvents();
      await handleTemplateFromRoute();
    } catch (error) {
      logRef.value?.addLog({ message: "编辑器初始化失败", level: "error" });
      console.error("Editor initialization failed", error);
      cleanupAll();
      const currentEditor = editor.value;
      editor.value = undefined;
      await currentEditor?.dispose().catch((cleanupError) => console.error("Editor disposal failed", cleanupError));
    }
  })();
});

onUnmounted(() => {
  cleanupAll();
});
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>
  <EditorLog ref="logRef" />
  <StatusBar :selected-tool="selectedTool" :tool-labels="toolLabels" :element-count="elementCount" />
  <PanelDockRail />

  <EditorTopBar :editor="editor" v-model:selected-tool="state.activeTool.value" />
  <EditorActionBar :editor="editor" @open-plugin-market="openMarket('plugin')"
    @open-template-market="openMarket('template')" />

  <LayerPanel v-if="showLayerPanel" :editor="editor" :open="layerPanelOpen" />
  <EditorPanel :editor="editor" />

  <CanvasLayer :editor="editor" :state="state" />

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" :controls="viewControls" />
  </div>

  <Overlays :editor="editor" :state="state" :panels="overlayPanels" />
</template>
