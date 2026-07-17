<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { type Editor } from "@/editor";
import EditorTopBar from "@/components/EditorTopBar.vue";
import EditorActionBar from "@/components/EditorActionBar.vue";
import EditorLog from "@/components/EditorLog.vue";
import EditorPanel from "@/components/EditorPanel.vue";
import LayerPanel from "@/components/LayerTree/LayerPanel.vue";
import PanelDockRail from "@/components/PanelDockRail.vue";
import StatusBar from "@/components/StatusBar.vue";
import ViewControls from "@/components/ViewControls.vue";
import CanvasLayer from "@/views/editor-page/CanvasLayer.vue";
import Overlays from "@/views/editor-page/Overlays.vue";
import { providePanelVisibility } from "@/views/editor-page";
import { usePageSetup, usePageState } from "@/views/editor-page";
import { useTemplateRoute } from "@/views/editor-page";

type LogLevel = "info" | "success" | "warning" | "error";

interface RuntimeLogApi {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

const editorRef = useTemplateRef("editorRef");
const logRef = useTemplateRef<RuntimeLogApi>("logRef");
const editor = shallowRef<Editor>();

const state = usePageState();
const panelVisibility = providePanelVisibility(state);
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

const { initializeApp, bindEvents, runtime } = usePageSetup({
  editor,
  editorElement: editorRef,
  logRef,
  state,
  panelVisibility,
});

const toolLabels = computed(() => runtime.toolLabels.value);

const { handleTemplateFromRoute } = useTemplateRoute({ editor, logRef });

onMounted(() => {
  void (async () => {
    await initializeApp();
    bindEvents();
    await handleTemplateFromRoute();
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
  <EditorActionBar :editor="editor" />

  <LayerPanel v-if="showLayerPanel" :editor="editor" :open="layerPanelOpen" />
  <EditorPanel :editor="editor" />

  <CanvasLayer :editor="editor" :state="state" />

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" :controls="viewControls" />
  </div>

  <Overlays :editor="editor" :state="state" />
</template>
