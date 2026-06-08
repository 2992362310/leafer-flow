import type { EditorPluginModule } from "../../api/plugin";
import { architectureShapesPlugin } from "../plugins/architecture-shapes";
import { basicToolsPlugin } from "../plugins/basic-tools";
import { bpmnShapesPlugin } from "../plugins/bpmn-shapes";
import { canvasDotMatrixPlugin } from "../plugins/canvas-dot-matrix";
import { canvasRulerPlugin } from "../plugins/canvas-ruler";
import { canvasSnapPlugin } from "../plugins/canvas-snap";
import { flowShapesPlugin } from "../plugins/flow-shapes";

export const builtinPlugins: EditorPluginModule[] = [
  canvasRulerPlugin,
  canvasSnapPlugin,
  canvasDotMatrixPlugin,
  basicToolsPlugin,
  flowShapesPlugin,
  bpmnShapesPlugin,
  architectureShapesPlugin,
];
