import type { EditorPluginModule } from "../../api/plugin";
import { architectureShapesPlugin } from "../plugins/architecture-shapes";
import { basicToolsPlugin } from "../plugins/basic-tools";
import { bpmnShapesPlugin } from "../plugins/bpmn-shapes";
import { builtinCorePlugin } from "../plugins/builtin-core";
import { canvasDotMatrixPlugin } from "../plugins/canvas-dot-matrix";
import { canvasRulerPlugin } from "../plugins/canvas-ruler";
import { canvasSnapPlugin } from "../plugins/canvas-snap";
import { drawingSettingsPlugin } from "./drawing-settings";
import { customDataPanelPlugin } from "./custom-data-panel";
import { exportActionsPlugin } from "../plugins/export-actions";
import { fileActionsPlugin } from "../plugins/file-actions";
import { flowShapesPlugin } from "../plugins/flow-shapes";
import { templateActionsPlugin } from "../plugins/template-actions";
import { viewControlsPlugin } from "../plugins/view-controls";

export const builtinPlugins: EditorPluginModule[] = [
  builtinCorePlugin,
  canvasRulerPlugin,
  canvasSnapPlugin,
  canvasDotMatrixPlugin,
  drawingSettingsPlugin,
  customDataPanelPlugin,
  viewControlsPlugin,
  fileActionsPlugin,
  exportActionsPlugin,
  templateActionsPlugin,
  basicToolsPlugin,
  flowShapesPlugin,
  bpmnShapesPlugin,
  architectureShapesPlugin,
];
