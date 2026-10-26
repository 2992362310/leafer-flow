import { Group, Text, type App, type IUI } from "leafer";
import { createConnectorLabel, syncConnectorLabels } from "./connector-labels";
import {
  createFlowNodeShape,
  FLOW_BOX_SIZE_PROP,
  updateFlowNodeShape,
} from "./flow-node-shape";
import {
  edgeToConnectorState,
  type FlowGraph,
  type FlowGraphNode,
  type FlowGraphNodeStyle,
} from "./flow-graph";
import { makeGroupSelectionAtomic, normalizeAtomicGroups } from "./group-selection";
import {
  restoreConnectors,
  type DeserializeResult,
  type SerializedChild,
} from "./flow-serialization";

const DEFAULT_NODE_STYLE: FlowGraphNodeStyle = {
  fill: "#eff6ff",
  stroke: "#2563eb",
  strokeWidth: 2,
};

/**
 * Project a semantic FlowGraph onto the canvas.
 * Nodes use the same DrawFlowNode.createFixedElement path as shape drops;
 * edges go through the shared connector restore path (remap + setState).
 */
export function appendFlowGraph(app: App, graph: FlowGraph): DeserializeResult {
  const idMap = new Map<string | number, IUI>();
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const node of graph.nodes) {
    const element = createFlowGraphNode(node);
    app.tree.add(element);
    addNodeMapping(idMap, node.id, element);
    addNodeMapping(idMap, element.innerId, element);
  }

  const connectorChildren: SerializedChild[] = [];
  for (const edge of graph.edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;

    connectorChildren.push({
      __isConnector: true,
      __flowConnectorId: edge.id,
      __connectorState: edgeToConnectorState(edge, from, to) as Record<string, unknown>,
    });
  }

  const { failedConnectors, connectorMap } = restoreConnectors(app, connectorChildren, idMap, {
    deferUpdate: true,
  });

  for (const edge of graph.edges) {
    if (!edge.label) continue;
    const connector = connectorMap.get(edge.id) || connectorMap.get(String(edge.id));
    if (!connector) continue;

    // Force geometry once so label anchors to the live route, then bind follow-up updates.
    connector.requestUpdate();
    const label = createConnectorLabel(connector);
    label.text = edge.label;
    app.tree.add(label);
    connector.syncAttachedLabels();
  }

  normalizeAtomicGroups(app.tree.children as IUI[] | undefined);
  try {
    syncConnectorLabels(app);
  } catch (e) {
    console.warn("同步连接线标签失败:", e);
  }

  return { failedConnectors };
}

/**
 * Build a sized flow node Group before tree attach.
 * Avoid Group({ children }) with empty Path/Ellipse — Leafer Layouter crashes on around/toPoint.
 */
export function createFlowGraphNode(node: FlowGraphNode): IUI {
  const style = node.style ?? DEFAULT_NODE_STYLE;
  const shape = createFlowNodeShape(node.kind, {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth ?? 2,
  });
  updateFlowNodeShape(shape, node.kind, node.width, node.height);

  const text = new Text({
    draggable: false,
    editable: true,
    text: node.text,
    fill: "#1f2937",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    verticalAlign: "middle",
    x: 12,
    y: 10,
    width: Math.max(node.width - 24, 0),
    height: Math.max(node.height - 20, 0),
  });

  const group = new Group({
    editable: true,
    x: node.x,
    y: node.y,
    name: node.text,
  });
  group.add([shape, text]);
  makeGroupSelectionAtomic(group);

  (group as unknown as Record<string, unknown>)[FLOW_BOX_SIZE_PROP] = {
    width: node.width,
    height: node.height,
  };

  return group;
}

function addNodeMapping(idMap: Map<string | number, IUI>, id: string | number, node: IUI) {
  idMap.set(id, node);
  idMap.set(String(id), node);
}
