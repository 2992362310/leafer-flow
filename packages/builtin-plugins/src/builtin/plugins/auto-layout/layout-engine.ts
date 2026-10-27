import dagre from "dagre";
import type { DocumentEdge, DocumentNode, EditorDocument } from "@leafer-flow/core";

export interface LayoutOptions {
    direction: "TB" | "BT" | "LR" | "RL";
    nodeSep: number;
    rankSep: number;
    marginX: number;
    marginY: number;
    skipLocked: boolean;
}

export interface LayoutResult {
    success: boolean;
    message: string;
    movedCount?: number;
    positions?: Record<string, { x: number; y: number }>;
}

const DEFAULT_OPTIONS: LayoutOptions = {
    direction: "TB",
    nodeSep: 50,
    rankSep: 80,
    marginX: 50,
    marginY: 50,
    skipLocked: true,
};

interface NodeEntry {
    node: DocumentNode;
    parentId: string | null;
    hidden: boolean;
    locked: boolean;
}

export function autoLayout(
    document: EditorDocument,
    ids: string[],
    options: Partial<LayoutOptions> = {},
): LayoutResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!ids.length) return { success: false, message: "没有可布局的节点" };

    const allNodes = new Map<string, NodeEntry>();
    const visit = (nodes: DocumentNode[], parentId: string | null, hidden: boolean, locked: boolean) => {
        for (const node of nodes) {
            const nodeHidden = hidden || node.data.visible === false;
            const nodeLocked = locked || node.data.locked === true;
            allNodes.set(node.id, { node, parentId, hidden: nodeHidden, locked: nodeLocked });
            visit(node.children, node.id, nodeHidden, nodeLocked);
        }
    };
    visit(document.nodes, null, false, false);

    const requested = [...new Set(ids)].map((id) => allNodes.get(id)).filter((entry): entry is NodeEntry => Boolean(entry));
    if (!requested.length) return { success: false, message: "没有可布局的节点" };
    const eligible = requested.filter((entry) => !entry.hidden && (!opts.skipLocked || !entry.locked));
    if (!eligible.length) {
        return { success: false, message: requested.some((entry) => entry.locked) ? "选中节点均已锁定，无法自动布局" : "没有可布局的节点" };
    }

    const positions: Record<string, { x: number; y: number }> = {};
    const parents = new Set(eligible.map((entry) => entry.parentId));
    for (const parentId of parents) {
        const nodes = eligible.filter((entry) => entry.parentId === parentId).map((entry) => entry.node);
        if (!nodes.length) continue;
        const nodeIds = new Set(nodes.map((node) => node.id));
        const edges = document.edges.filter((edge) => edge.parentId === parentId
            && "nodeId" in edge.from && "nodeId" in edge.to
            && nodeIds.has(edge.from.nodeId) && nodeIds.has(edge.to.nodeId));
        layoutSiblingNodes(nodes, edges, opts, positions);
    }

    const movedCount = Object.entries(positions).filter(([id, position]) => {
        const node = allNodes.get(id)!.node;
        return Math.abs(Number(node.data.x ?? 0) - position.x) > 1 || Math.abs(Number(node.data.y ?? 0) - position.y) > 1;
    }).length;
    if (!movedCount) return { success: true, message: "布局已是最优，无需调整", movedCount: 0, positions };
    const skipped = requested.length - eligible.length;
    return {
        success: true,
        message: skipped ? `已自动布局 ${movedCount} 个节点（跳过 ${skipped} 个隐藏或锁定节点）` : `已自动布局 ${movedCount} 个节点`,
        movedCount,
        positions,
    };
}

function layoutSiblingNodes(
    nodes: DocumentNode[],
    edges: DocumentEdge[],
    options: LayoutOptions,
    positions: Record<string, { x: number; y: number }>,
) {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
        rankdir: options.direction,
        nodesep: options.nodeSep,
        ranksep: options.rankSep,
        marginx: options.marginX,
        marginy: options.marginY,
    });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of nodes) {
        graph.setNode(node.id, {
            width: positiveDimension(node.data.width, 120),
            height: positiveDimension(node.data.height, 60),
        });
    }
    for (const edge of edges) {
        if ("nodeId" in edge.from && "nodeId" in edge.to) graph.setEdge(edge.from.nodeId, edge.to.nodeId);
    }
    if (graph.edgeCount() === 0 && nodes.length > 1) inferEdgesFromPositions(graph, nodes, options.direction);
    dagre.layout(graph);
    for (const node of nodes) {
        const result = graph.node(node.id);
        if (!result) continue;
        positions[node.id] = {
            x: result.x - positiveDimension(node.data.width, 120) / 2,
            y: result.y - positiveDimension(node.data.height, 60) / 2,
        };
    }
}

function positiveDimension(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function inferEdgesFromPositions(graph: dagre.graphlib.Graph, nodes: DocumentNode[], direction: LayoutOptions["direction"]) {
    const sorted = [...nodes].sort((a, b) => {
        const primary = direction === "TB" || direction === "BT" ? "y" : "x";
        return Number(a.data[primary] ?? 0) - Number(b.data[primary] ?? 0);
    });
    for (let index = 0; index < sorted.length - 1; index++) {
        const current = sorted[index]!;
        const next = sorted[index + 1]!;
        const primary = direction === "TB" || direction === "BT" ? "y" : "x";
        if (Math.abs(Number(current.data[primary] ?? 0) - Number(next.data[primary] ?? 0)) >= 20) {
            graph.setEdge(current.id, next.id);
        }
    }
}

export const LAYOUT_PRESETS = {
    "top-to-bottom": { direction: "TB" as const, label: "从上到下", description: "适合流程图" },
    "left-to-right": { direction: "LR" as const, label: "从左到右", description: "适合组织架构图" },
    "bottom-to-top": { direction: "BT" as const, label: "从下到上", description: "适合反向流程" },
    "right-to-left": { direction: "RL" as const, label: "从右到左", description: "适合 RTL 布局" },
};
