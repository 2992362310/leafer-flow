import type Editor from "../editor";
import { getTemplateStyle, templateMap, type TemplateKind } from "../templates/defs";
import { insertTemplateFlow } from "../templates/insert";
import { applyConnectorWorkbenchSettings } from "../core/connector-workbench-settings";
import type { FlowDocumentSettings } from "../core/flow-serialization";
import type { FlowGraph } from "../core/flow-graph";

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
    insertTemplateFlow(editor.app, data.graph, getTemplateStyle);

    const settings = resolveTemplateSettings(data.graph, data.settings);
    if (settings) {
      await applyConnectorWorkbenchSettings(editor, settings);
    }

    editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
    editor.endTransaction();
    await editor.autoSave.save();
    return { success: true, message: data.message };
  } catch (error) {
    editor.endTransaction();
    return {
      success: false,
      message: "模板插入失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
