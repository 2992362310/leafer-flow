<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import type { IUI } from "leafer";
import { WatchEvent } from "leafer";
import {
  initEditor,
  type Editor,
  doClear,
  doUndo,
  doRedo,
  doDelete,
  doGroup,
  doUnGroup,
  doSave,
  doLoad,
  doExportPNG,
  doExportSVG,
  doCopy,
  doPaste,
  doAlign,
  doAddConnectorLabel,
  doSelectAll,
  doInsertTemplate,
  doViewAction,
  getZoomPercent,
  doNudge,
  doLayer,
  doToggleLock,
  doToggleVisible,
  getSnapEnabled,
  setSnapEnabled,
} from "./editor";
import { useEditorShortcuts } from "./editor/shortcuts";
import { ACTION_NAME, TOOL_NAME } from "./editor/constants";
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
import type { ShapeLibraryItem } from "./editor/shape-library";
import { shapeLibraryGroups } from "./editor/shape-library";
import type { IExecuteArg, IExecuteCommand } from "./editor/types";

const editorRef = useTemplateRef("editorRef");
const toolbarRef = useTemplateRef("toolbarRef");
const logRef = useTemplateRef("logRef");
const editor = shallowRef<Editor>();

const elementCount = ref(0);
const zoomPercent = ref(100);
const marquee = ref({ active: false, x: 0, y: 0, width: 0, height: 0 });
let marqueeStart = { x: 0, y: 0 };
let marqueeDragging = false;
let cleanupMarquee: (() => void) | null = null;

const { syncCurrentTool } = useEditorShortcuts({
  onTool: handleTool,
  onAction: handleAction,
});

onMounted(() => {
  initializeApp();
});

onUnmounted(() => {
  cleanupMarquee?.();
});

function initializeApp() {
  if (!editorRef.value) return;

  editor.value = initEditor(editorRef.value);
  bindSelectionMarquee(editor.value);
  bindShapeDrop(editor.value);

  editor.value.app.tree.on(WatchEvent.DATA, () => {
    if (!editor.value) return;
    elementCount.value = editor.value.app.tree.children.length;
    zoomPercent.value = getZoomPercent(editor.value);
  });

  const loaded = editor.value.autoSave.load();
  if (loaded) {
    elementCount.value = editor.value.app.tree.children.length;
    zoomPercent.value = getZoomPercent(editor.value);
    editor.value.history.save();
    logRef.value?.addLog({ message: "已恢复上次编辑的数据", level: "info" });
  }

  logRef.value?.addLog({ message: "应用初始化完成", level: "success" });
}

function bindShapeDrop(currentEditor: Editor) {
  const container = currentEditor.app.view as HTMLElement;
  if (!container) return;

  const onDragOver = (evt: DragEvent) => {
    if (!evt.dataTransfer?.types.includes("application/x-leafer-flow-shape")) return;
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (evt: DragEvent) => {
    const raw = evt.dataTransfer?.getData("application/x-leafer-flow-shape");
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

  const previousCleanup = cleanupMarquee;
  cleanupMarquee = () => {
    previousCleanup?.();
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  };
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

  elementCount.value = editor.value.app.tree.children.length;
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
  for (const group of shapeLibraryGroups) {
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
  cleanupMarquee = () => {
    container.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
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

  if (width < 6 && height < 6) return;
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
  toolbarRef.value?.changeTool(nextTool);
  syncCurrentTool(nextTool);
}

function handleTool(evt: IExecuteCommand) {
  if (!editor.value) return;
  toolbarRef.value?.changeTool(evt.command);
  syncCurrentTool(evt.command);
  editor.value.execute(evt, executeCallback);
  logRef.value?.addLog({ message: `开始执行工具: ${evt.command}`, level: "info" });
}

function logResult(result: { success: boolean; message: string }, warning = true) {
  logRef.value?.addLog({
    message: result.message,
    level: result.success ? "success" : warning ? "warning" : "error",
  });
}

function handleAction(action: string) {
  if (!editor.value) return;
  logRef.value?.addLog({ message: `执行操作: ${action}` });

  if (action === ACTION_NAME.CLEAR_CANVAS) logResult(doClear(editor.value), false);
  if (action === ACTION_NAME.UNDO) logResult(doUndo(editor.value));
  if (action === ACTION_NAME.REDO) logResult(doRedo(editor.value));
  if (action === ACTION_NAME.DELETE) logResult(doDelete(editor.value));
  if (action === ACTION_NAME.GROUP) logResult(doGroup(editor.value));
  if (action === ACTION_NAME.UNGROUP) logResult(doUnGroup(editor.value));
  if (action === ACTION_NAME.SAVE) logResult(doSave(editor.value), false);

  if (action === ACTION_NAME.LOAD) {
    const result = doLoad(editor.value);
    if (result instanceof Promise) result.then((r) => logResult(r, false));
    else logResult(result, false);
  }

  if (action === ACTION_NAME.EXPORT_PNG) logResult(doExportPNG(editor.value), false);
  if (action === ACTION_NAME.EXPORT_SVG) logResult(doExportSVG(editor.value), false);
  if (action === ACTION_NAME.COPY) logResult(doCopy(editor.value));
  if (action === ACTION_NAME.PASTE) logResult(doPaste(editor.value));

  if (
    action === ACTION_NAME.ALIGN_LEFT ||
    action === ACTION_NAME.ALIGN_CENTER ||
    action === ACTION_NAME.ALIGN_RIGHT ||
    action === ACTION_NAME.ALIGN_TOP ||
    action === ACTION_NAME.ALIGN_MIDDLE ||
    action === ACTION_NAME.ALIGN_BOTTOM ||
    action === ACTION_NAME.DISTRIBUTE_HORIZONTAL ||
    action === ACTION_NAME.DISTRIBUTE_VERTICAL
  ) {
    logResult(doAlign(editor.value, action));
  }

  if (action === ACTION_NAME.ADD_CONNECTOR_LABEL) logResult(doAddConnectorLabel(editor.value));
  if (action === ACTION_NAME.SELECT_ALL) logResult(doSelectAll(editor.value));

  if (
    action === ACTION_NAME.BRING_FORWARD ||
    action === ACTION_NAME.SEND_BACKWARD ||
    action === ACTION_NAME.BRING_TO_FRONT ||
    action === ACTION_NAME.SEND_TO_BACK
  ) {
    logResult(doLayer(editor.value, action as "bringForward" | "sendBackward" | "bringToFront" | "sendToBack"));
  }

  if (action === ACTION_NAME.LOCK_SELECTED) logResult(doToggleLock(editor.value, true));
  if (action === ACTION_NAME.UNLOCK_SELECTED) logResult(doToggleLock(editor.value, false));
  if (action === ACTION_NAME.TOGGLE_VISIBLE) {
    const selected = editor.value.app.editor.list || [];
    logResult(doToggleVisible(editor.value, selected.some((item) => !item.visible)));
  }

  if (action === ACTION_NAME.TOGGLE_SNAP) {
    const next = !getSnapEnabled();
    setSnapEnabled(next);
    editor.value.snap?.enable(next);
    logRef.value?.addLog({ message: next ? "已开启吸附" : "已关闭吸附", level: "info" });
  }

  if (
    action.startsWith("nudgeLeft") ||
    action.startsWith("nudgeRight") ||
    action.startsWith("nudgeUp") ||
    action.startsWith("nudgeDown")
  ) {
    const step = Number(action.split(":")[1] || 1);
    logResult(
      doNudge(
        editor.value,
        action.startsWith("nudgeLeft") ? -step : action.startsWith("nudgeRight") ? step : 0,
        action.startsWith("nudgeUp") ? -step : action.startsWith("nudgeDown") ? step : 0,
      ),
    );
  }

  const templateActionMap = {
    [ACTION_NAME.TEMPLATE_APPROVAL]: "approval",
    [ACTION_NAME.TEMPLATE_DECISION]: "decision",
    [ACTION_NAME.TEMPLATE_WORK_ORDER]: "workOrder",
    [ACTION_NAME.TEMPLATE_CRM]: "crm",
    [ACTION_NAME.TEMPLATE_LOGIN]: "login",
    [ACTION_NAME.TEMPLATE_PAYMENT]: "payment",
    [ACTION_NAME.TEMPLATE_BPMN_ORDER]: "bpmnOrder",
    [ACTION_NAME.TEMPLATE_SYSTEM_ARCHITECTURE]: "systemArchitecture",
    [ACTION_NAME.TEMPLATE_SWIMLANE_COLLABORATION]: "swimlaneCollaboration",
  } as const;

  if (action in templateActionMap) {
    logResult(doInsertTemplate(editor.value, templateActionMap[action as keyof typeof templateActionMap]));
    zoomPercent.value = getZoomPercent(editor.value);
  }

  const viewActionMap = {
    [ACTION_NAME.VIEW_FIT]: "fit",
    [ACTION_NAME.VIEW_CENTER]: "center",
    [ACTION_NAME.ZOOM_IN]: "zoomIn",
    [ACTION_NAME.ZOOM_OUT]: "zoomOut",
    [ACTION_NAME.ZOOM_RESET]: "reset",
  } as const;

  if (action in viewActionMap) {
    logResult(doViewAction(editor.value, viewActionMap[action as keyof typeof viewActionMap]));
    zoomPercent.value = getZoomPercent(editor.value);
  }
}

function handleContextMenuAction({
  result,
}: {
  action: string;
  result: { success: boolean; message: string };
}) {
  logResult(result);
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

  <ShapeLibrary @tool="handleLibraryTool" />

  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl !top-12 !left-[calc(50%+5rem)] -translate-x-1/2"
  >
    <EditorToolbar @tool="handleTool" ref="toolbarRef" />
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
  <ContextMenu :editor="editor" @action="handleContextMenuAction" />
</template>
