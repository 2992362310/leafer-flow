import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { architectureShapesPlugin } from "./architecture-shapes";
import { basicToolsPlugin } from "./basic-tools";
import { bpmnShapesPlugin } from "./bpmn-shapes";
import { builtinCorePlugin } from "./builtin-core";
import { canvasDotMatrixPlugin } from "./canvas-dot-matrix";
import { canvasRulerPlugin } from "./canvas-ruler";
import { canvasSnapPlugin } from "./canvas-snap";
import { drawingSettingsPlugin } from "./drawing-settings";
import { customDataPanelPlugin } from "./custom-data-panel";
import { exportActionsPlugin } from "./export-actions";
import { fileActionsPlugin } from "./file-actions";
import { flowShapesPlugin } from "./flow-shapes";
import { templatesPlugin } from "../templates";
import { createTemplateActionsPlugin } from "./template-actions";
import { viewControlsPlugin } from "./view-controls";
import { agentPlugin } from "./agent";
import { autoLayoutPlugin } from "./auto-layout";
import { diagramLintPlugin } from "./diagram-lint";
import { minimapPlugin } from "./minimap";
import { multiLayerPlugin } from "./multi-layer";
import { connectorAnimationPlugin } from "./connector-animation";
import { taskNodePlugin } from "./task-node";

export interface BuiltinPluginOptions {
  canUseTemplateAction?: (action: string) => boolean;
}

export function createBuiltinPlugins(options: BuiltinPluginOptions = {}): EditorPluginModule[] {
  return [
    builtinCorePlugin,
    canvasRulerPlugin,
    canvasSnapPlugin,
    canvasDotMatrixPlugin,
    drawingSettingsPlugin,
    customDataPanelPlugin,
    viewControlsPlugin,
    fileActionsPlugin,
    exportActionsPlugin,
    templatesPlugin,
    createTemplateActionsPlugin(options.canUseTemplateAction),
    basicToolsPlugin,
    flowShapesPlugin,
    bpmnShapesPlugin,
    architectureShapesPlugin,
    taskNodePlugin,
    agentPlugin,
    autoLayoutPlugin,
    connectorAnimationPlugin,
    diagramLintPlugin,
    minimapPlugin,
    multiLayerPlugin,
  ];
}

export const builtinPlugins = createBuiltinPlugins();
