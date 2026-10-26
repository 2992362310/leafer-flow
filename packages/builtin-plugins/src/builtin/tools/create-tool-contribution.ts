import { TOOL_NAME } from "@leafer-flow/core/constants";
import { getToolShortcutLabel } from "@leafer-flow/core/core/tool-shortcuts";
import { DrawArrow } from "@leafer-flow/core/tools/draw-arrow";
import { DrawCircle } from "@leafer-flow/core/tools/draw-circle";
import { DrawDiamond } from "@leafer-flow/core/tools/draw-diamond";
import { DrawFlowNode, type FlowNodeKind } from "@leafer-flow/core/tools/draw-flow-node";
import { DrawFreehand } from "@leafer-flow/core/tools/draw-freehand";
import { DrawRect } from "@leafer-flow/core/tools/draw-rect";
import { DrawText } from "@leafer-flow/core/tools/draw-text";
import type { ToolContribution } from "@leafer-flow/core/api/tool";
import type { ToolDefinition } from "@leafer-flow/core/tool-definitions";

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
        groupTitle: definition.library.groupTitle,
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
    groupTitle: getToolbarGroupTitle(definition),
    icon,
    tip: createToolTip(definition),
    shortcut: getToolShortcutLabel(definition.tool),
    order,
  };
}

function getToolbarGroupId(definition: ToolDefinition) {
  if (definition.toolbarGroupId) return definition.toolbarGroupId;
  if (!definition.library) return "core";
  if (definition.library.groupId === "basic") return "shapes";
  return definition.library.groupId;
}

function getToolbarGroupTitle(definition: ToolDefinition) {
  if (definition.toolbarGroupTitle) return definition.toolbarGroupTitle;
  if (!definition.library) return "核心工具";
  if (definition.library.groupId === "basic") return "基础图形";
  return definition.library.groupTitle;
}

function createToolTip(definition: ToolDefinition) {
  const shortcut = getToolShortcutLabel(definition.tool);
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
