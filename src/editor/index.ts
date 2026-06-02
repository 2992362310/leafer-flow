import Editor from "./editor";
import { TOOL_NAME } from "./constants";

import { editorDotMatrix } from "./plugins/dot-matrix";
import { editorRuler } from "./plugins/ruler";
import { editorSnap } from "./plugins/snap";

import { DrawArrow } from "./tools/draw-arrow";
import { DrawCircle } from "./tools/draw-circle";
import { DrawDiamond } from "./tools/draw-diamond";
import { DrawFlowNode, type FlowNodeKind } from "./tools/draw-flow-node";
import { DrawFreehand } from "./tools/draw-freehand";
import { DrawRect } from "./tools/draw-rect";
import { DrawText } from "./tools/draw-text";
import { toolDefinitions, type ToolDefinition } from "./tool-definitions";

import { doAlign } from "./action/do-align";
import { doClear } from "./action/do-clear";
import { doCopy, doPaste } from "./action/do-clipboard";
import { doAddConnectorLabel } from "./action/do-connector-label";
import { doConnectorToFront } from "./action/do-connector-layer";
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

  registerTools(editor);

  return editor;
}

function registerTools(editor: Editor) {
  toolDefinitions.forEach((definition) => {
    editor.register(definition.tool, createTool(definition));
  });
}

function createTool(definition: ToolDefinition) {
  const { registration } = definition;

  if (registration.type === "flow-node") {
    return new DrawFlowNode({
      kind: registration.kind as FlowNodeKind,
      label: definition.label,
      fill: registration.fill,
      stroke: registration.stroke,
      strokeWidth: registration.strokeWidth,
      cornerRadius: registration.cornerRadius,
    });
  }

  switch (registration.toolKind) {
    case "rect":
      return new DrawRect();
    case "arrow":
      return new DrawArrow();
    case "circle":
      return new DrawCircle();
    case "diamond":
      return new DrawDiamond();
    case "text":
      return new DrawText();
    case "freehand":
      return new DrawFreehand();
  }
}

export {
  Editor,
  doAddConnectorLabel,
  doAlign,
  doClear,
  doConnectorToFront,
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
