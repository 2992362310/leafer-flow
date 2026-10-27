import { Group, Text, type IUI } from "leafer";
import { createFlowNodeShape, FLOW_BOX_SIZE_PROP, updateFlowNodeShape, type FlowNodeKind } from "./flow-node-shape";
import type { FlowGraphNode, FlowGraphNodeStyle } from "./flow-graph";
import { makeGroupSelectionAtomic } from "./group-selection";

const DEFAULT_NODE_STYLE: FlowGraphNodeStyle = {
  fill: "#eff6ff",
  stroke: "#2563eb",
  strokeWidth: 2,
};

/** Create the Leafer view for a flow-node document value. */
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

  const group = new Group({ editable: true, x: node.x, y: node.y, name: node.text });
  group.add([shape, text]);
  makeGroupSelectionAtomic(group);
  (group as unknown as Record<string, unknown>)[FLOW_BOX_SIZE_PROP] = {
    width: node.width,
    height: node.height,
  };
  return group;
}
