import type { ConnectorSide } from "./connector";
import type { FlowNodeKind } from "./flow-node-shape";

export type FlowConnectorState = {
  mode: "node";
  fromId: string;
  toId: string;
  fromPoint: { x: number; y: number };
  toPoint: { x: number; y: number };
  opt1: { side: ConnectorSide; percent: number };
  opt2: { side: ConnectorSide; percent: number };
  routeType: "orthogonal" | "bezier" | "straight" | "custom";
  padding: number;
  margin: number;
  cornerRadius: number;
  bezierCurvature: number;
  stroke: string;
  strokeWidth: number;
  endArrow: "arrow";
};

/**
 * Semantic flow graph — authoring / import / template source of truth.
 * Runtime projection is the Leafer tree + Connector instances.
 * Keep this free of Leafer UI types so converters stay testable.
 */
export type FlowGraphNodeStyle = {
  fill: string;
  stroke: string;
  strokeWidth?: number;
};

export type FlowGraphNode = {
  id: string;
  kind: FlowNodeKind;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: FlowGraphNodeStyle;
};

export type FlowGraphEdge = {
  id: string;
  from: string;
  to: string;
  fromSide: ConnectorSide;
  toSide: ConnectorSide;
  label?: string;
  routeType?: "orthogonal" | "bezier" | "straight" | "custom";
};

export type FlowGraph = {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
};

const DEFAULT_ROUTE = {
  routeType: "orthogonal" as const,
  padding: 28,
  margin: 0,
  cornerRadius: 10,
  bezierCurvature: 0.45,
  stroke: "#278bfe",
  strokeWidth: 2,
  endArrow: "arrow" as const,
};

/** Build connector state keyed by graph node ids (remap to innerId at hydrate time). */
export function edgeToConnectorState(
  edge: FlowGraphEdge,
  from: FlowGraphNode,
  to: FlowGraphNode,
): FlowConnectorState {
  return {
    mode: "node",
    fromId: edge.from,
    toId: edge.to,
    ...DEFAULT_ROUTE,
    routeType: edge.routeType ?? DEFAULT_ROUTE.routeType,
    opt1: { side: edge.fromSide, percent: 0.5 },
    opt2: { side: edge.toSide, percent: 0.5 },
    // Fallback anchors if node-mode bind fails and remap drops to point mode.
    fromPoint: sidePoint(from, edge.fromSide),
    toPoint: sidePoint(to, edge.toSide),
  };
}

export function centerOfNode(node: Pick<FlowGraphNode, "x" | "y" | "width" | "height">) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

export function sidePoint(
  node: Pick<FlowGraphNode, "x" | "y" | "width" | "height">,
  side: ConnectorSide,
  percent = 0.5,
) {
  const { x, y, width, height } = node;
  if (side === "top") return { x: x + width * percent, y };
  if (side === "bottom") return { x: x + width * percent, y: y + height };
  if (side === "left") return { x, y: y + height * percent };
  return { x: x + width, y: y + height * percent };
}
