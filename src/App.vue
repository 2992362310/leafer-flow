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
  doConnectorToFront,
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
import { shapeLibraryGroups, SHAPE_DROP_MIME } from "./editor/shape-library";
import type { IExecuteArg, IExecuteCommand } from "./editor/types";

const editorRef = useTemplateRef("editorRef");
const toolbarRef = useTemplateRef("toolbarRef");
const logRef = useTemplateRef("logRef");
const editor = shallowRef<Editor>();

const elementCount = ref(0);
const zoomPercent = ref(100);
const activeTool = ref<string>(TOOL_NAME.SELECT);
const marquee = ref({ active: false, x: 0, y: 0, width: 0, height: 0 });
let marqueeStart = { x: 0, y: 0 };
let marqueeDragging = false;
const cleanupCallbacks: Array<() => void> = [];

type AlignAction =
  | typeof ACTION_NAME.ALIGN_LEFT
  | typeof ACTION_NAME.ALIGN_CENTER
  | typeof ACTION_NAME.ALIGN_RIGHT
  | typeof ACTION_NAME.ALIGN_TOP
  | typeof ACTION_NAME.ALIGN_MIDDLE
  | typeof ACTION_NAME.ALIGN_BOTTOM
  | typeof ACTION_NAME.DISTRIBUTE_HORIZONTAL
  | typeof ACTION_NAME.DISTRIBUTE_VERTICAL;
type ActionResult = { success: boolean; message: string };
type ActionRunner = {
  run: (currentEditor: Editor) => ActionResult | Promise<ActionResult>;
  warning?: boolean;
  refreshZoom?: boolean;
};

const MARQUEE_MIN_SIZE = 6;

const baseActionRunners: Record<string, ActionRunner> = {
  [ACTION_NAME.CLEAR_CANVAS]: { run: doClear, warning: false },
  [ACTION_NAME.UNDO]: { run: doUndo },
  [ACTION_NAME.REDO]: { run: doRedo },
  [ACTION_NAME.DELETE]: { run: doDelete },
  [ACTION_NAME.GROUP]: { run: doGroup },
  [ACTION_NAME.UNGROUP]: { run: doUnGroup },
  [ACTION_NAME.SAVE]: { run: doSave, warning: false },
  [ACTION_NAME.LOAD]: { run: doLoad, warning: false },
  [ACTION_NAME.EXPORT_PNG]: { run: doExportPNG, warning: false },
  [ACTION_NAME.EXPORT_SVG]: { run: doExportSVG, warning: false },
  [ACTION_NAME.COPY]: { run: doCopy },
  [ACTION_NAME.PASTE]: { run: doPaste },
  [ACTION_NAME.ADD_CONNECTOR_LABEL]: { run: doAddConnectorLabel },
  [ACTION_NAME.SELECT_ALL]: { run: doSelectAll },
  [ACTION_NAME.CONNECTORS_TO_FRONT]: { run: doConnectorToFront },
};

const alignActions = new Set<string>([
  ACTION_NAME.ALIGN_LEFT,
  ACTION_NAME.ALIGN_CENTER,
  ACTION_NAME.ALIGN_RIGHT,
  ACTION_NAME.ALIGN_TOP,
  ACTION_NAME.ALIGN_MIDDLE,
  ACTION_NAME.ALIGN_BOTTOM,
  ACTION_NAME.DISTRIBUTE_HORIZONTAL,
  ACTION_NAME.DISTRIBUTE_VERTICAL,
]);

const layerActionMap = {
  [ACTION_NAME.BRING_FORWARD]: "bringForward",
  [ACTION_NAME.SEND_BACKWARD]: "sendBackward",
  [ACTION_NAME.BRING_TO_FRONT]: "bringToFront",
  [ACTION_NAME.SEND_TO_BACK]: "sendToBack",
} as const;

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

const viewActionMap = {
  [ACTION_NAME.VIEW_FIT]: "fit",
  [ACTION_NAME.VIEW_CENTER]: "center",
  [ACTION_NAME.ZOOM_IN]: "zoomIn",
  [ACTION_NAME.ZOOM_OUT]: "zoomOut",
  [ACTION_NAME.ZOOM_RESET]: "reset",
} as const;

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

function handleAction(action: string) {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  logRef.value?.addLog({ message: `执行操作: ${action}` });
  dispatchAction(currentEditor, action);
}

function isAlignAction(action: string): action is AlignAction {
  return alignActions.has(action);
}

function dispatchAction(currentEditor: Editor, action: string) {
  const runner = baseActionRunners[action];
  if (runner) {
    runAction(currentEditor, runner);
    return;
  }

  if (isAlignAction(action)) {
    logResult(doAlign(currentEditor, action));
    return;
  }

  if (action in layerActionMap) {
    logResult(doLayer(currentEditor, layerActionMap[action as keyof typeof layerActionMap]));
    return;
  }

  if (action === ACTION_NAME.LOCK_SELECTED) {
    logResult(doToggleLock(currentEditor, true));
    return;
  }

  if (action === ACTION_NAME.UNLOCK_SELECTED) {
    logResult(doToggleLock(currentEditor, false));
    return;
  }

  if (action === ACTION_NAME.TOGGLE_VISIBLE) {
    const selected = currentEditor.app.editor.list || [];
    logResult(
      doToggleVisible(
        currentEditor,
        selected.some((item) => !item.visible),
      ),
    );
    return;
  }

  if (action === ACTION_NAME.TOGGLE_SNAP) {
    toggleSnap(currentEditor);
    return;
  }

  const nudge = parseNudgeAction(action);
  if (nudge) {
    logResult(doNudge(currentEditor, nudge.x, nudge.y));
    return;
  }

  if (action in templateActionMap) {
    logResult(
      doInsertTemplate(currentEditor, templateActionMap[action as keyof typeof templateActionMap]),
    );
    refreshEditorStats(currentEditor);
    return;
  }

  if (action in viewActionMap) {
    logResult(doViewAction(currentEditor, viewActionMap[action as keyof typeof viewActionMap]));
    refreshEditorStats(currentEditor);
  }
}

function runAction(currentEditor: Editor, runner: ActionRunner) {
  const result = runner.run(currentEditor);
  if (result instanceof Promise) {
    result.then((resolved) => {
      logResult(resolved, runner.warning);
      if (runner.refreshZoom) refreshEditorStats(currentEditor);
    });
    return;
  }

  logResult(result, runner.warning);
  if (runner.refreshZoom) refreshEditorStats(currentEditor);
}

function toggleSnap(currentEditor: Editor) {
  const next = !getSnapEnabled();
  setSnapEnabled(next);
  currentEditor.snap?.enable(next);
  logRef.value?.addLog({ message: next ? "已开启吸附" : "已关闭吸附", level: "info" });
}

function parseNudgeAction(action: string) {
  const match = /^(nudgeLeft|nudgeRight|nudgeUp|nudgeDown)(?::(\d+))?$/.exec(action);
  if (!match) return null;

  const direction = match[1];
  const step = Number(match[2] || 1);
  return {
    x: direction === "nudgeLeft" ? -step : direction === "nudgeRight" ? step : 0,
    y: direction === "nudgeUp" ? -step : direction === "nudgeDown" ? step : 0,
  };
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

  <ShapeLibrary :active-tool="activeTool" @tool="handleLibraryTool" />

  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl top-12! left-[calc(50%+5rem)]! -translate-x-1/2"
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
