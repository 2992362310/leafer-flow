import type Editor from "@leafer-flow/core/editor";
import type { FlowGraph, FlowGraphNodeStyle } from "@leafer-flow/core/core/flow-graph";
import type { FlowNodeKind } from "@leafer-flow/core/core/flow-node-shape";
import type { JsonObject } from "@leafer-flow/core";

/**
 * Insert a template FlowGraph via the shared apply path.
 */
export function insertTemplateFlow(
  editor: Editor,
  graph: FlowGraph,
  styleOf: (kind: FlowNodeKind) => FlowGraphNodeStyle,
  settings?: Record<string, unknown>,
) {
  const styled: FlowGraph = {
    nodes: graph.nodes.map((node) => ({
      ...node,
      style: node.style ?? styleOf(node.kind),
    })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
  return editor.documentCommands.insertFlowGraph(styled, styleOf, settings as JsonObject | undefined);
}
