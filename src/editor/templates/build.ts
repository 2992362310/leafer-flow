import type { ConnectorSide } from "../core/connector";
import type { ConnectorStateLike, SerializedChild } from "../core/flow-serialization";
import { FLOW_BOX_SIZE_PROP, type FlowNodeKind } from "../core/flow-node-shape";
import { DrawFlowNode } from "../tools/draw-flow-node";
import type { Group, IUI } from "leafer";

export type TemplateFlowNode = {
  id: string;
  text: string;
  type: FlowNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateFlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromSide: ConnectorSide;
  toSide: ConnectorSide;
};

type FlowNodeStyle = {
  fill: string;
  stroke: string;
  strokeWidth?: number;
};

/**
 * Same path as shape-library drop: DrawFlowNode.createFixedElement.
 * Never add an empty Group — Leafer treats 0-size as auto-layout and crashes.
 */
export function createTemplateFlowNode(node: TemplateFlowNode, style: FlowNodeStyle): IUI {
  const drawer = new DrawFlowNode({
    kind: node.type,
    label: node.text,
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth ?? 2,
  });

  const element = drawer.createFixedElement(
    { x: node.x, y: node.y },
    { x: node.x + node.width, y: node.y + node.height },
  );

  element.name = node.text;
  (element as unknown as Record<string, unknown>)[FLOW_BOX_SIZE_PROP] = {
    width: node.width,
    height: node.height,
  };

  return element;
}

export function buildConnectorState(
  edge: TemplateFlowEdge,
  from: TemplateFlowNode,
  to: TemplateFlowNode,
): ConnectorStateLike {
  return {
    mode: "node",
    fromId: edge.from,
    toId: edge.to,
    routeType: "orthogonal",
    padding: 28,
    margin: 0,
    cornerRadius: 10,
    bezierCurvature: 0.45,
    opt1: { side: edge.fromSide, percent: 0.5 },
    opt2: { side: edge.toSide, percent: 0.5 },
    // Temporary draw points (side anchors); cleared when switching to node mode.
    fromPoint: sidePoint(from, edge.fromSide),
    toPoint: sidePoint(to, edge.toSide),
    stroke: "#278bfe",
    strokeWidth: 2,
    endArrow: "arrow",
  };
}

export function buildConnectorChild(
  edge: TemplateFlowEdge,
  from: TemplateFlowNode,
  to: TemplateFlowNode,
): SerializedChild {
  return {
    __isConnector: true,
    __flowConnectorId: edge.id,
    __connectorState: buildConnectorState(edge, from, to) as Record<string, unknown>,
  };
}

export function centerOf(node: TemplateFlowNode) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function sidePoint(node: TemplateFlowNode, side: ConnectorSide, percent = 0.5) {
  const { x, y, width, height } = node;
  if (side === "top") return { x: x + width * percent, y };
  if (side === "bottom") return { x: x + width * percent, y: y + height };
  if (side === "left") return { x, y: y + height * percent };
  return { x: x + width, y: y + height * percent };
}

export type { Group };
