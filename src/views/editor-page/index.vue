<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { TOOL_NAME } from "@/editor/constants";
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
const toolLabels = computed<Record<string, string>>(() => {
  if (!editor.value) {
    return { [TOOL_NAME.SELECT]: "选择" };
  }

  return {
    [TOOL_NAME.SELECT]: "选择",
    ...Object.fromEntries(
      editor.value.toolRegistry
        .list()
        .map((contribution) => [contribution.id, contribution.label]),
    ),
  };
});

const { initializeApp, bindEvents } = usePageSetup({
  editor,
  editorElement: editorRef,
  logRef,
  state,
  panelVisibility,
});

const { handleTemplateFromRoute } = useTemplateRoute({ editor, logRef });

onMounted(() => {
  initializeApp();
  void handleTemplateFromRoute();
  bindEvents();
});

onUnmounted(() => {
  cleanupAll();
});

async function handleViewAction(action: string) {
  if (!editor.value) return;
  await editor.value.commands.execute(action);
}
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>
  <EditorLog ref="logRef" />
  <StatusBar :selected-tool="selectedTool" :tool-labels="toolLabels" :element-count="elementCount" />
  <PanelDockRail />

  <EditorTopBar
    :editor="editor"
    v-model:selected-tool="state.activeTool.value"
    :show-action-buttons="false"
  />
  <EditorActionBar :editor="editor" />

  <LayerPanel v-if="showLayerPanel" :editor="editor" :open="layerPanelOpen" />
  <EditorPanel :editor="editor" class="z-10" />

  <CanvasLayer :editor="editor" :state="state" />

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" :controls="viewControls" @action="handleViewAction" />
  </div>

  <Overlays :editor="editor" :state="state" />
</template>
