import Editor from "./editor";
import { TOOL_NAME } from "./constants";

import { editorDotMatrix } from "./plugins/dot-matrix";
import { editorRuler } from "./plugins/ruler";
import { editorSnap } from "./plugins/snap";

import { DrawArrow } from "./tools/draw-arrow";
import { DrawCircle } from "./tools/draw-circle";
import { DrawDiamond } from "./tools/draw-diamond";
import { DrawFlowNode } from "./tools/draw-flow-node";
import { DrawFreehand } from "./tools/draw-freehand";
import { DrawRect } from "./tools/draw-rect";
import { DrawText } from "./tools/draw-text";

import { doAlign } from "./action/do-align";
import { doClear } from "./action/do-clear";
import { doCopy, doPaste } from "./action/do-clipboard";
import { doAddConnectorLabel } from "./action/do-connector-label";
import { doDelete } from "./action/do-delete";
import { doExportPNG, doExportSVG, doLoad, doSave } from "./action/do-file";
import { doGroup } from "./action/do-group";
import { doLayer, doToggleLock, doToggleVisible } from "./action/do-layer";
import { doNudge } from "./action/do-nudge";
import { doRedo } from "./action/do-redo";
import { doSelectAll } from "./action/do-select-all";
import { doInsertTemplate } from "./action/do-template";
import { doUndo } from "./action/do-undo";
import { doUnGroup } from "./action/do-ungroup";
import { doViewAction, getZoomPercent } from "./action/do-view";
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
} from "./core/drawing-settings";
import { applyStylePreset, stylePresets } from "./core/style-presets";

export function initEditor(view: HTMLElement) {
  const editor = new Editor({
    view,
    editor: {},
    tree: { type: "design" },
  });

  editor.use(editorRuler);
  editor.use(editorSnap);
  editor.use(editorDotMatrix);

  registerBasicTools(editor);
  registerFlowTools(editor);
  registerBpmnTools(editor);
  registerArchitectureTools(editor);

  return editor;
}

function registerBasicTools(editor: Editor) {
  editor.register(TOOL_NAME.DRAW_RECT, new DrawRect());
  editor.register(TOOL_NAME.DRAW_ARROW, new DrawArrow());
  editor.register(TOOL_NAME.DRAW_CIRCLE, new DrawCircle());
  editor.register(TOOL_NAME.DRAW_DIAMOND, new DrawDiamond());
  editor.register(TOOL_NAME.DRAW_TEXT, new DrawText());
  editor.register(TOOL_NAME.DRAW_FREEHAND, new DrawFreehand());
  editor.register(
    TOOL_NAME.DRAW_TRIANGLE,
    new DrawFlowNode({ kind: "triangle", label: "三角形", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.DRAW_PENTAGON,
    new DrawFlowNode({ kind: "pentagon", label: "五边形", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.DRAW_HEXAGON,
    new DrawFlowNode({ kind: "hexagon", label: "六边形", fill: "#f8fafc", stroke: "#475569" }),
  );
}

function registerFlowTools(editor: Editor) {
  editor.register(
    TOOL_NAME.FLOW_START_END,
    new DrawFlowNode({ kind: "startEnd", label: "开始/结束", fill: "#ecfdf5", stroke: "#059669" }),
  );
  editor.register(
    TOOL_NAME.FLOW_PROCESS,
    new DrawFlowNode({ kind: "process", label: "处理", fill: "#eff6ff", stroke: "#2563eb" }),
  );
  editor.register(
    TOOL_NAME.FLOW_DECISION,
    new DrawFlowNode({ kind: "decision", label: "判断", fill: "#fffbeb", stroke: "#d97706" }),
  );
  editor.register(
    TOOL_NAME.FLOW_IO,
    new DrawFlowNode({ kind: "io", label: "输入/输出", fill: "#f5f3ff", stroke: "#7c3aed" }),
  );
  editor.register(
    TOOL_NAME.FLOW_DOCUMENT,
    new DrawFlowNode({ kind: "document", label: "文档", fill: "#fff7ed", stroke: "#ea580c" }),
  );
  editor.register(
    TOOL_NAME.FLOW_DATABASE,
    new DrawFlowNode({ kind: "database", label: "数据存储", fill: "#ecfeff", stroke: "#0891b2" }),
  );
  editor.register(
    TOOL_NAME.FLOW_SUBPROCESS,
    new DrawFlowNode({ kind: "subprocess", label: "子流程", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.FLOW_CONNECTOR,
    new DrawFlowNode({ kind: "connector", label: "", fill: "#ffffff", stroke: "#64748b" }),
  );
  editor.register(
    TOOL_NAME.FLOW_SWIMLANE,
    new DrawFlowNode({ kind: "swimlane", label: "泳道", fill: "#f0f9ff", stroke: "#0284c7" }),
  );
  editor.register(
    TOOL_NAME.FLOW_DELAY,
    new DrawFlowNode({ kind: "delay", label: "延迟", fill: "#fefce8", stroke: "#ca8a04" }),
  );
  editor.register(
    TOOL_NAME.FLOW_PREPARATION,
    new DrawFlowNode({ kind: "preparation", label: "准备", fill: "#f0fdf4", stroke: "#16a34a" }),
  );
  editor.register(
    TOOL_NAME.FLOW_MANUAL_INPUT,
    new DrawFlowNode({ kind: "manualInput", label: "手动输入", fill: "#fdf2f8", stroke: "#db2777" }),
  );
  editor.register(
    TOOL_NAME.FLOW_MANUAL_OPERATION,
    new DrawFlowNode({ kind: "manualOperation", label: "手动操作", fill: "#f5f3ff", stroke: "#7c3aed" }),
  );
  editor.register(
    TOOL_NAME.FLOW_STORED_DATA,
    new DrawFlowNode({ kind: "storedData", label: "存储数据", fill: "#ecfeff", stroke: "#0891b2" }),
  );
  editor.register(
    TOOL_NAME.FLOW_DISPLAY,
    new DrawFlowNode({ kind: "display", label: "显示", fill: "#eef2ff", stroke: "#4f46e5" }),
  );
  editor.register(
    TOOL_NAME.FLOW_OFF_PAGE,
    new DrawFlowNode({ kind: "offPage", label: "离页连接", fill: "#fff7ed", stroke: "#ea580c" }),
  );
  editor.register(
    TOOL_NAME.FLOW_MERGE,
    new DrawFlowNode({ kind: "merge", label: "合并", fill: "#fef2f2", stroke: "#dc2626" }),
  );
  editor.register(
    TOOL_NAME.FLOW_ANNOTATION,
    new DrawFlowNode({ kind: "annotation", label: "注释", fill: "#ffffff", stroke: "#64748b" }),
  );
}

function registerBpmnTools(editor: Editor) {
  editor.register(
    TOOL_NAME.BPMN_START_EVENT,
    new DrawFlowNode({ kind: "bpmnStartEvent", label: "开始事件", fill: "#ffffff", stroke: "#16a34a" }),
  );
  editor.register(
    TOOL_NAME.BPMN_INTERMEDIATE_EVENT,
    new DrawFlowNode({ kind: "bpmnIntermediateEvent", label: "中间事件", fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 3 }),
  );
  editor.register(
    TOOL_NAME.BPMN_END_EVENT,
    new DrawFlowNode({ kind: "bpmnEndEvent", label: "结束事件", fill: "#ffffff", stroke: "#dc2626", strokeWidth: 4 }),
  );
  editor.register(
    TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
    new DrawFlowNode({ kind: "bpmnExclusiveGateway", label: "排他网关", fill: "#fffbeb", stroke: "#d97706" }),
  );
  editor.register(
    TOOL_NAME.BPMN_PARALLEL_GATEWAY,
    new DrawFlowNode({ kind: "bpmnParallelGateway", label: "并行网关", fill: "#eff6ff", stroke: "#2563eb" }),
  );
  editor.register(
    TOOL_NAME.BPMN_INCLUSIVE_GATEWAY,
    new DrawFlowNode({ kind: "bpmnInclusiveGateway", label: "包容网关", fill: "#f5f3ff", stroke: "#7c3aed" }),
  );
  editor.register(
    TOOL_NAME.BPMN_TASK,
    new DrawFlowNode({ kind: "bpmnTask", label: "任务", fill: "#ffffff", stroke: "#475569", cornerRadius: 10 }),
  );
  editor.register(
    TOOL_NAME.BPMN_DATA_OBJECT,
    new DrawFlowNode({ kind: "bpmnDataObject", label: "数据对象", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.BPMN_DATA_STORE,
    new DrawFlowNode({ kind: "bpmnDataStore", label: "数据存储", fill: "#ecfeff", stroke: "#0891b2" }),
  );
}

function registerArchitectureTools(editor: Editor) {
  editor.register(
    TOOL_NAME.ARCH_ACTOR,
    new DrawFlowNode({ kind: "archActor", label: "Actor", fill: "#ffffff", stroke: "#111827" }),
  );
  editor.register(
    TOOL_NAME.ARCH_USE_CASE,
    new DrawFlowNode({ kind: "archUseCase", label: "用例", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.ARCH_COMPONENT,
    new DrawFlowNode({ kind: "archComponent", label: "组件", fill: "#eff6ff", stroke: "#2563eb" }),
  );
  editor.register(
    TOOL_NAME.ARCH_PACKAGE,
    new DrawFlowNode({ kind: "archPackage", label: "包", fill: "#fff7ed", stroke: "#ea580c" }),
  );
  editor.register(
    TOOL_NAME.ARCH_NODE,
    new DrawFlowNode({ kind: "archNode", label: "部署节点", fill: "#f8fafc", stroke: "#475569" }),
  );
  editor.register(
    TOOL_NAME.ARCH_QUEUE,
    new DrawFlowNode({ kind: "archQueue", label: "队列", fill: "#f0f9ff", stroke: "#0284c7" }),
  );
  editor.register(
    TOOL_NAME.ARCH_CACHE,
    new DrawFlowNode({ kind: "archCache", label: "缓存", fill: "#ecfeff", stroke: "#0891b2" }),
  );
  editor.register(
    TOOL_NAME.ARCH_CLOUD,
    new DrawFlowNode({ kind: "archCloud", label: "云", fill: "#eef2ff", stroke: "#4f46e5" }),
  );
  editor.register(
    TOOL_NAME.ARCH_SERVICE,
    new DrawFlowNode({ kind: "archService", label: "服务", fill: "#f0fdf4", stroke: "#16a34a" }),
  );
  editor.register(
    TOOL_NAME.ARCH_DEVICE,
    new DrawFlowNode({ kind: "archDevice", label: "设备", fill: "#f8fafc", stroke: "#334155" }),
  );
}

export {
  Editor,
  doAddConnectorLabel,
  doAlign,
  doClear,
  doCopy,
  doDelete,
  doExportPNG,
  doExportSVG,
  doGroup,
  doInsertTemplate,
  doLayer,
  doLoad,
  doNudge,
  doPaste,
  doRedo,
  doSave,
  doSelectAll,
  doToggleLock,
  doToggleVisible,
  doUndo,
  doUnGroup,
  doViewAction,
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  getZoomPercent,
  applyStylePreset,
  stylePresets,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
};
