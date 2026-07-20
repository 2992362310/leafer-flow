import type { App } from "leafer";
import { appendFlowGraph } from "../core/flow-graph-apply";
import type { FlowGraph, FlowGraphNodeStyle } from "../core/flow-graph";
import type { FlowNodeKind } from "../core/flow-node-shape";
import type { DeserializeResult } from "../core/flow-serialization";

/**
 * Insert a template FlowGraph via the shared apply path.
 */
export function insertTemplateFlow(
  app: App,
  graph: FlowGraph,
  styleOf: (kind: FlowNodeKind) => FlowGraphNodeStyle,
): DeserializeResult {
  const styled: FlowGraph = {
    nodes: graph.nodes.map((node) => ({
      ...node,
      style: node.style ?? styleOf(node.kind),
    })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
  return appendFlowGraph(app, styled);
}
