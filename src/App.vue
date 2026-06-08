<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import type { IUI } from "leafer";
import { WatchEvent } from "leafer";
import { initEditor, type Editor, getZoomPercent } from "./editor";
import { useEditorShortcuts } from "./editor/shortcuts";
import { TOOL_NAME } from "./editor/constants";
import { collectSelectableItems } from "./editor/utils/selection";
import EditorToolbar from "./components/EditorToolbar.vue";
import EditorButton from "./components/EditorButton.vue";
import EditorLog from "./components/EditorLog.vue";
import EditorPanel from "./components/EditorPanel.vue";
import LayerPanel from "./components/LayerTree/LayerPanel.vue";
import StatusBar from "./components/StatusBar.vue";
import ViewControls from "./components/ViewControls.vue";
import ContextMenu from "./components/ContextMenu.vue";
import SelectionMarquee from "./components/SelectionMarquee.vue";
import ShapeLibrary from "./components/ShapeLibrary.vue";
import PluginMarketDrawer from "./components/PluginMarket/PluginMarketDrawer.vue";
import type { ShapeLibraryGroup, ShapeLibraryItem } from "./editor/shape-library";
import { shapeLibraryGroups, SHAPE_DROP_MIME } from "./editor/shape-library";
import type { ToolToolbarGroup } from "./editor/api/tool";
import type { CommandResult } from "./editor/api/command";
import type { IExecuteArg, IExecuteCommand } from "./editor/types";

const editorRef = useTemplateRef("editorRef");
const toolbarRef = useTemplateRef("toolbarRef");
const logRef = useTemplateRef("logRef");
const editor = shallowRef<Editor>();

const elementCount = ref(0);
const zoomPercent = ref(100);
const activeTool = ref<string>(TOOL_NAME.SELECT);
const runtimeShapeLibraryGroups = ref<ShapeLibraryGroup[]>(shapeLibraryGroups);
const runtimeToolbarGroups = ref<ToolToolbarGroup[]>([]);
const pluginMarketOpen = ref(false);
const marquee = ref({ active: false, x: 0, y: 0, width: 0, height: 0 });
let marqueeStart = { x: 0, y: 0 };
let marqueeDragging = false;
const cleanupCallbacks: Array<() => void> = [];

type ActionResult = CommandResult;

const MARQUEE_MIN_SIZE = 6;

const { syncCurrentTool } = useEditorShortcuts({
  onTool: handleTool,
  onAction: handleAction,
});

onMounted(() => {
  initializeApp();
});

onUnmounted(() => {
  cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
});

function initializeApp() {
  if (!editorRef.value) return;

  editor.value = initEditor(editorRef.value);
  refreshRuntimeToolContributions(editor.value);
  bindSelectionMarquee(editor.value);
  bindShapeDrop(editor.value);

  editor.value.app.tree.on(WatchEvent.DATA, () => {
    if (!editor.value) return;
    refreshEditorStats(editor.value);
  });

  const loadResult = editor.value.autoSave.load();
  if (loadResult.loaded) {
    refreshEditorStats(editor.value);
    editor.value.history.save();
    logRef.value?.addLog({ message: "已恢复上次编辑的数据", level: "info" });
    if (loadResult.failedConnectors > 0) {
      logRef.value?.addLog({
        message: `${loadResult.failedConnectors} 条连接线恢复节点绑定失败，已转为浮动线段`,
        level: "warning",
      });
    }
  }

  logRef.value?.addLog({ message: "应用初始化完成", level: "success" });
}

function refreshEditorStats(currentEditor: Editor) {
  elementCount.value = currentEditor.app.tree.children.length;
  zoomPercent.value = getZoomPercent(currentEditor);
}

function refreshRuntimeToolContributions(currentEditor: Editor) {
  refreshShapeLibraryGroups(currentEditor);
  refreshToolbarGroups(currentEditor);
}

function refreshShapeLibraryGroups(currentEditor: Editor) {
  const groups = currentEditor.toolRegistry.getShapeLibraryGroups();
  runtimeShapeLibraryGroups.value = groups.length > 0 ? groups : shapeLibraryGroups;
}

function refreshToolbarGroups(currentEditor: Editor) {
  runtimeToolbarGroups.value = currentEditor.toolRegistry.getToolbarGroups();
}

function addCleanup(cleanup: () => void) {
  cleanupCallbacks.push(cleanup);
}

function bindShapeDrop(currentEditor: Editor) {
  const container = currentEditor.app.view as HTMLElement;
  if (!container) return;

  const onDragOver = (evt: DragEvent) => {
    if (!evt.dataTransfer?.types.includes(SHAPE_DROP_MIME)) return;
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (evt: DragEvent) => {
    const raw = evt.dataTransfer?.getData(SHAPE_DROP_MIME);
    if (!raw) return;

    evt.preventDefault();
    try {
      const item = JSON.parse(raw) as ShapeLibraryItem;
      createShapeAtPointer(item, evt);
    } catch (error) {
      console.warn("解析拖拽图形失败", error);
    }
  };

  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);

  addCleanup(() => {
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  });
}

function createShapeAtPointer(item: ShapeLibraryItem, evt: DragEvent) {
  if (!editor.value || !editorRef.value) return;

  const rect = editorRef.value.getBoundingClientRect();
  const width = item.width ?? 120;
  const height = item.height ?? 72;
  const startPoint = {
    x: evt.clientX - rect.left - width / 2,
    y: evt.clientY - rect.top - height / 2,
  };

  const element = editor.value.createElementFromTool(item.tool, startPoint, { width, height });
  if (!element) {
    logRef.value?.addLog({ message: `暂不支持拖拽创建：${item.label}`, level: "warning" });
    return;
  }

  refreshEditorStats(editor.value);
  logRef.value?.addLog({ message: `已创建 ${item.label}`, level: "success" });
}

function handleLibraryTool(tool: string) {
  const item = findShapeItem(tool);
  handleTool({ command: tool, pre: toolbarRef.value?.selectedTool ?? TOOL_NAME.SELECT });
  if (item) {
    logRef.value?.addLog({ message: `已选择图形：${item.label}`, level: "info" });
  }
}

function findShapeItem(tool: string) {
  for (const group of runtimeShapeLibraryGroups.value) {
    const item = group.items.find((entry) => entry.tool === tool);
    if (item) return item;
  }
  return undefined;
}

function bindSelectionMarquee(currentEditor: Editor) {
  const container = currentEditor.app.view as HTMLElement;
  if (!container) return;

  const onDown = (evt: PointerEvent) => handleMarqueeDown(evt, container);
  const onMove = (evt: PointerEvent) => handleMarqueeMove(evt, container);
  const onUp = (evt: PointerEvent) => handleMarqueeUp(evt, container);

  container.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  addCleanup(() => {
    container.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  });
}

function getCanvasPoint(evt: PointerEvent, container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

function handleMarqueeDown(evt: PointerEvent, container: HTMLElement) {
  if (!editor.value || evt.button !== 0) return;
  if (toolbarRef.value?.selectedTool && toolbarRef.value.selectedTool !== TOOL_NAME.SELECT) return;
  if (evt.target !== container) return;

  const point = getCanvasPoint(evt, container);
  marqueeStart = point;
  marqueeDragging = true;
  marquee.value = { active: true, x: point.x, y: point.y, width: 0, height: 0 };
}

function handleMarqueeMove(evt: PointerEvent, container: HTMLElement) {
  if (!marqueeDragging) return;
  const point = getCanvasPoint(evt, container);
  const x = Math.min(marqueeStart.x, point.x);
  const y = Math.min(marqueeStart.y, point.y);
  const width = Math.abs(point.x - marqueeStart.x);
  const height = Math.abs(point.y - marqueeStart.y);
  marquee.value = { active: true, x, y, width, height };
}

function handleMarqueeUp(evt: PointerEvent, container: HTMLElement) {
  if (!marqueeDragging || !editor.value) return;
  marqueeDragging = false;

  const point = getCanvasPoint(evt, container);
  const x = Math.min(marqueeStart.x, point.x);
  const y = Math.min(marqueeStart.y, point.y);
  const width = Math.abs(point.x - marqueeStart.x);
  const height = Math.abs(point.y - marqueeStart.y);
  marquee.value.active = false;

  if (width < MARQUEE_MIN_SIZE && height < MARQUEE_MIN_SIZE) return;
  selectWithinBounds({ x, y, width, height });
}

function selectWithinBounds(bounds: { x: number; y: number; width: number; height: number }) {
  if (!editor.value) return;
  const items = collectSelectableItems((editor.value.app.tree.children || []) as IUI[]);
  const selected = items.filter((item) => {
    const box = item.getBounds("box", "page");
    return (
      box.x < bounds.x + bounds.width &&
      box.x + box.width > bounds.x &&
      box.y < bounds.y + bounds.height &&
      box.y + box.height > bounds.y
    );
  });

  if (!selected.length) return;
  editor.value.app.editor.select(selected);
  logRef.value?.addLog({ message: `框选 ${selected.length} 个元素`, level: "info" });
}

function executeCallback<T>(arg: T) {
  const { action, tool, next } = arg as IExecuteArg;
  logRef.value?.addLog({
    message: `${tool} ${action}`,
    command: tool,
    level: next ? "error" : "success",
  });

  const nextTool = next ?? TOOL_NAME.SELECT;
  activeTool.value = nextTool;
  toolbarRef.value?.changeTool(nextTool);
  syncCurrentTool(nextTool);
}

function handleTool(evt: IExecuteCommand) {
  if (!editor.value) return;
  activeTool.value = evt.command;
  toolbarRef.value?.changeTool(evt.command);
  syncCurrentTool(evt.command);
  editor.value.execute(evt, executeCallback);
  logRef.value?.addLog({ message: `开始执行工具: ${evt.command}`, level: "info" });
}

function logResult(result: ActionResult, warning = true) {
  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : warning ? "warning" : "error",
  });
}

async function handleAction(action: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  logRef.value?.addLog({ message: `执行操作: ${action}` });
  const result = await currentEditor.commands.execute(action);
  logResult(result, result.warning);
  if (result.refreshZoom) refreshEditorStats(currentEditor);
}

function handlePluginMarketChanged() {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  refreshRuntimeToolContributions(currentEditor);
  activeTool.value = TOOL_NAME.SELECT;
  toolbarRef.value?.changeTool(TOOL_NAME.SELECT);
  syncCurrentTool(TOOL_NAME.SELECT);
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

  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl top-12! left-[calc(50%+5rem)]! -translate-x-1/2"
  >
    <EditorToolbar :groups="runtimeToolbarGroups" @tool="handleTool" ref="toolbarRef" />
    <span class="divider divider-horizontal mx-0 my-1"></span>
    <button class="btn btn-sm h-9" @click="pluginMarketOpen = true">插件</button>
    <span class="divider divider-horizontal mx-0 my-1"></span>
    <EditorButton @action="handleAction" />
  </div>

  <LayerPanel :editor="editor" />
  <EditorPanel :editor="editor" class="z-10" />

  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar :selected-tool="toolbarRef?.selectedTool" :element-count="elementCount" />
  </div>

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" @action="handleAction" />
  </div>

  <EditorLog class="absolute bottom-2 right-4" ref="logRef" />
  <ContextMenu :editor="editor" @action="handleAction" />
  <PluginMarketDrawer
    :editor="editor"
    :open="pluginMarketOpen"
    @close="pluginMarketOpen = false"
    @changed="handlePluginMarketChanged"
  />
</template>
