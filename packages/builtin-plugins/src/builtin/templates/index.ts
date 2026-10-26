/**
 * Template Management Plugin
 *
 * Provides template management capabilities, including:
 * - Template registry and lookup
 * - Template insertion via the action layer
 * - Integration with plugin market for Pro features
 * - Support for custom and user-defined templates (future)
 */

import type Editor from "@leafer-flow/core/editor";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { insertTemplateFlow } from "../../templates/insert";
import { applyConnectorWorkbenchSettings } from "@leafer-flow/core/core/connector-workbench-settings";
import type { FlowDocumentSettings } from "@leafer-flow/core/core/flow-serialization";
import type { FlowGraph } from "@leafer-flow/core/core/flow-graph";
import { TemplateRegistry, type TemplateKind } from "./registry";

const PLUGIN_ID = "leafer-flow.templates";

/**
 * Infer connector route type from template graph edges
 */
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

/**
 * Resolve template document settings from template definition
 */
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

/**
 * Template Manager Service
 *
 * Public API for template operations accessible to other plugins and tools.
 */
export class TemplateManager {
  constructor(private editor: Editor) { }

  /**
   * Insert a template into the canvas at specified position with optional scaling
   */
  async insertTemplate(
    kind: TemplateKind,
    options?: {
      offsetX?: number;
      offsetY?: number;
      scale?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    const offsetX = options?.offsetX ?? 100;
    const offsetY = options?.offsetY ?? 80;
    const scale = Math.max(0.5, Math.min(2, options?.scale ?? 1));

    if (!TemplateRegistry.isValidKind(kind)) {
      return { success: false, message: `不支持的模板类型: ${kind}` };
    }

    this.editor.beginTransaction();

    try {
      const data = TemplateRegistry.getTemplate(kind);
      if (!data) {
        return { success: false, message: `无法加载模板: ${kind}` };
      }

      // Apply position offset and scale
      const transformedGraph = {
        nodes: data.graph.nodes.map((node) => ({
          ...node,
          x: node.x * scale + offsetX,
          y: node.y * scale + offsetY,
          width: node.width * scale,
          height: node.height * scale,
        })),
        edges: data.graph.edges.map((edge) => ({ ...edge })),
      };

      insertTemplateFlow(this.editor.app, transformedGraph, TemplateRegistry.getNodeStyle);

      const settings = resolveTemplateSettings(data.graph, data.settings);
      if (settings) {
        await applyConnectorWorkbenchSettings(this.editor, settings);
      }

      this.editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
      this.editor.endTransaction();
      await this.editor.autoSave.save();

      const scaleStr = scale !== 1 ? ` (缩放 ${Math.round(scale * 100)}%)` : "";
      return { success: true, message: data.message + scaleStr };
    } catch (error) {
      this.editor.endTransaction();
      return {
        success: false,
        message: "模板插入失败: " + (error instanceof Error ? error.message : "未知错误"),
      };
    }
  }
}

/**
 * Template Plugin Module
 *
 * Registers as a service that other plugins (template-actions, agent) can depend on.
 */
export const templatesPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "模板管理",
    version: "1.2.0",
    description: "提供模板管理和注册功能。其他插件可依赖此插件使用模板功能。",
    category: "utility",
    capabilities: ["template", "service"],
    enabledByDefault: true,
  },
  activate(ctx) {
    // Create template manager service
    const manager = new TemplateManager(ctx.editor);

    // Expose template manager to other plugins via editor context
    (ctx.editor as unknown as Record<string, unknown>).__templateManager__ = manager;

    // Expose template registry for read-only access
    (ctx.editor as unknown as Record<string, unknown>).__templateRegistry__ = TemplateRegistry;
  },
};
