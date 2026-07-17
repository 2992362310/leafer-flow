import { Text, type App, type IUI } from "leafer";
import {
  CONNECTOR_LABEL_OFFSET_X_PROP,
  CONNECTOR_LABEL_OFFSET_Y_PROP,
  CONNECTOR_LABEL_PROP,
  syncConnectorLabels,
} from "../core/connector-labels";
import { createConnector, type DeserializeResult } from "../core/flow-serialization";
import { normalizeAtomicGroups } from "../core/group-selection";
import {
  buildConnectorState,
  centerOf,
  createTemplateFlowNode,
  type TemplateFlowEdge,
  type TemplateFlowNode,
} from "./build";
import type { FlowNodeKind } from "../core/flow-node-shape";

type FlowNodeStyle = {
  fill: string;
  stroke: string;
  strokeWidth?: number;
};

/**
 * Insert template via the same DrawFlowNode.createFixedElement path as shape drops,
 * then restore connectors in point mode before deferred node bind.
 */
export function insertTemplateFlow(
  app: App,
  nodes: TemplateFlowNode[],
  edges: TemplateFlowEdge[],
  styleOf: (type: FlowNodeKind) => FlowNodeStyle,
): DeserializeResult {
  const idMap = new Map<string | number, IUI>();
  const nodeMeta = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const element = createTemplateFlowNode(node, styleOf(node.type));
    app.tree.add(element);
    idMap.set(node.id, element);
    idMap.set(String(node.id), element);
    idMap.set(element.innerId, element);
    idMap.set(String(element.innerId), element);
  }

  for (const edge of edges) {
    const fromMeta = nodeMeta.get(edge.from);
    const toMeta = nodeMeta.get(edge.to);
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!fromMeta || !toMeta || !from || !to) continue;

    const state = buildConnectorState(edge, fromMeta, toMeta);
    const connector = createConnector(app);
    app.tree.add(connector);

    // Point mode draws immediately from template side anchors (no getBounds).
    connector.setState(
      {
        ...state,
        mode: "point",
        fromPoint: state.fromPoint,
        toPoint: state.toPoint,
        fromId: undefined,
        toId: undefined,
      } as never,
      () => undefined,
    );

    // Bind nodes on next frame; bounds use __flowBoxSize fallback.
    connector.switchToNodeMode(from, to, { defer: true });

    if (edge.label) {
      const fromPt = state.fromPoint ?? centerOf(fromMeta);
      const toPt = state.toPoint ?? centerOf(toMeta);
      const label = new Text({
        name: "连接线标签",
        x: (fromPt.x + toPt.x) / 2 - 18,
        y: (fromPt.y + toPt.y) / 2 - 10,
        width: 36,
        height: 20,
        text: edge.label,
        editable: true,
        fill: "#1f2937",
        fontSize: 12,
        textAlign: "center",
        verticalAlign: "middle",
        padding: 2,
        around: "white",
      });
      (label as unknown as Record<string, unknown>)[CONNECTOR_LABEL_PROP] = connector.innerId;
      (label as unknown as Record<string, unknown>)[CONNECTOR_LABEL_OFFSET_X_PROP] = 0;
      (label as unknown as Record<string, unknown>)[CONNECTOR_LABEL_OFFSET_Y_PROP] = 0;
      app.tree.add(label);
    }
  }

  normalizeAtomicGroups(app.tree.children as IUI[] | undefined);
  try {
    syncConnectorLabels(app);
  } catch (e) {
    console.warn("同步连接线标签失败:", e);
  }

  return { failedConnectors: 0 };
}
