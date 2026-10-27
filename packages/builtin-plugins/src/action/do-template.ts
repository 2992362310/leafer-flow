import type Editor from "@leafer-flow/core/editor";
import { getTemplateStyle, templateMap, type TemplateKind } from "../templates/defs";
import { insertTemplateFlow } from "../templates/insert";
import { applyConnectorWorkbenchSettings } from "@leafer-flow/core/core/connector-workbench-settings";
import type { FlowDocumentSettings } from "@leafer-flow/core";
import type { FlowGraph } from "@leafer-flow/core/core/flow-graph";

export type { TemplateKind };

function inferRouteTypeFromGraph(graph: FlowGraph): FlowDocumentSettings["connectorRouteType"] {
  const routeTypes = graph.edges
    .map((edge) => edge.routeType)
    .filter((type): type is "orthogonal" | "bezier" | "straight" => {
      return type === "orthogonal" || type === "bezier" || type === "straight";
    });

  if (routeTypes.length === 0) return undefined;

  const counts = new Map<"orthogonal" | "bezier" | "straight", number>();
  routeTypes.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));

  let picked: "orthogonal" | "bezier" | "straight" | undefined;
  let max = -1;
  counts.forEach((count, type) => {
    if (count > max) {
      max = count;
      picked = type;
    }
  });

  return picked;
}

function resolveTemplateSettings(
  graph: FlowGraph,
  settings?: FlowDocumentSettings,
): FlowDocumentSettings | undefined {
  const next: FlowDocumentSettings = settings ? structuredClone(settings) : {};
  if (!next.connectorRouteType) {
    next.connectorRouteType = inferRouteTypeFromGraph(graph);
  }

  if (!next.connectorRouteType && !next.connectorFlowAnimation) {
    return undefined;
  }

  return next;
}

export async function doInsertTemplate(
  editor: Editor,
  kind: TemplateKind,
): Promise<{ success: boolean; message: string }> {
  editor.beginTransaction();

  try {
    const data = templateMap[kind]();
    const settings = resolveTemplateSettings(data.graph, data.settings);
    insertTemplateFlow(editor, data.graph, getTemplateStyle, settings);

    if (settings) {
      await applyConnectorWorkbenchSettings(editor, settings);
    }

    editor.endTransaction();
    return { success: true, message: data.message };
  } catch (error) {
    editor.endTransaction();
    return {
      success: false,
      message: "模板插入失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
