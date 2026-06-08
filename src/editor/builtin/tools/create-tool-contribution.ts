import { TOOL_NAME } from "../../constants";
import { DrawArrow } from "../../tools/draw-arrow";
import { DrawCircle } from "../../tools/draw-circle";
import { DrawDiamond } from "../../tools/draw-diamond";
import { DrawFlowNode, type FlowNodeKind } from "../../tools/draw-flow-node";
import { DrawFreehand } from "../../tools/draw-freehand";
import { DrawRect } from "../../tools/draw-rect";
import { DrawText } from "../../tools/draw-text";
import type { ToolContribution } from "../../api/tool";
import type { ToolDefinition } from "../../tool-definitions";

export function createToolContribution(
  definition: ToolDefinition,
  pluginId: string,
  order: number,
): ToolContribution {
  return {
    id: definition.tool,
    label: definition.label,
    pluginId,
    order,
    createTool: () => createTool(definition),
    library: definition.library
      ? {
          groupId: definition.library.groupId,
          icon: definition.library.icon,
          keywords: definition.library.keywords,
          width: definition.library.width,
          height: definition.library.height,
        }
      : undefined,
    toolbar: createToolbarContribution(definition, order),
  };
}

function createToolbarContribution(definition: ToolDefinition, order: number) {
  const library = definition.library;
  const icon = library?.icon ?? getClassToolIcon(definition);
  if (!icon) return undefined;

  return {
    groupId: getToolbarGroupId(definition),
    icon,
    tip: createToolTip(definition),
    shortcut: getToolShortcut(definition.tool),
    order,
  };
}

function getToolbarGroupId(definition: ToolDefinition) {
  if (!definition.library) return "core";
  if (definition.library.groupId === "basic") return "shapes";
  return definition.library.groupId;
}

function createToolTip(definition: ToolDefinition) {
  const shortcut = getToolShortcut(definition.tool);
  return shortcut ? `${definition.label} (${shortcut})` : definition.label;
}

function getClassToolIcon(definition: ToolDefinition) {
  if (definition.registration.type !== "class") return undefined;

  switch (definition.registration.toolKind) {
    case "arrow":
      return "draw_arrow";
    case "text":
      return "draw_text";
    case "rect":
      return "draw_rect";
    case "circle":
      return "draw_circle";
    case "diamond":
      return "draw_diamond";
    case "freehand":
      return "draw_freehand";
  }
}

function getToolShortcut(tool: string) {
  const shortcuts: Partial<Record<string, string>> = {
    [TOOL_NAME.DRAW_RECT]: "R",
    [TOOL_NAME.DRAW_CIRCLE]: "C",
    [TOOL_NAME.DRAW_DIAMOND]: "D",
    [TOOL_NAME.DRAW_TRIANGLE]: "U",
    [TOOL_NAME.DRAW_HEXAGON]: "X",
    [TOOL_NAME.DRAW_ARROW]: "A",
    [TOOL_NAME.DRAW_TEXT]: "T",
    [TOOL_NAME.DRAW_FREEHAND]: "P",
    [TOOL_NAME.FLOW_START_END]: "1",
    [TOOL_NAME.FLOW_PROCESS]: "2",
    [TOOL_NAME.FLOW_DECISION]: "3",
    [TOOL_NAME.FLOW_IO]: "4",
    [TOOL_NAME.FLOW_DOCUMENT]: "5",
    [TOOL_NAME.FLOW_DATABASE]: "6",
    [TOOL_NAME.FLOW_SUBPROCESS]: "7",
    [TOOL_NAME.FLOW_CONNECTOR]: "8",
    [TOOL_NAME.FLOW_SWIMLANE]: "9",
  };

  return shortcuts[tool];
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
