import dagre from "dagre";
import type { IUI } from "leafer";
import { Connector } from "../../../core/connector";

export interface LayoutOptions {
  direction: "TB" | "BT" | "LR" | "RL";
  nodeSep: number;
  rankSep: number;
  marginX: number;
  marginY: number;
}

export interface LayoutResult {
  success: boolean;
  message: string;
  movedCount?: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: "TB",
  nodeSep: 50,
  rankSep: 80,
  marginX: 50,
  marginY: 50,
};

export function autoLayout(
  elements: IUI[],
  options: Partial<LayoutOptions> = {},
): LayoutResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (elements.length === 0) {
    return { success: false, message: "没有选中元素" };
  }

  // 分离节点和连接线
  const nodes: IUI[] = [];
  const connectors: Connector[] = [];

  for (const el of elements) {
    if (el instanceof Connector) {
      connectors.push(el);
    } else {
      nodes.push(el);
    }
  }

  if (nodes.length === 0) {
    return { success: false, message: "没有可布局的节点" };
  }

  // 创建 dagre 图
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
    marginx: opts.marginX,
    marginy: opts.marginY,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // 添加节点
  for (const node of nodes) {
    const id = String(node.innerId);
    const width = node.width || 120;
    const height = node.height || 60;
    g.setNode(id, { width, height });
  }

  // 添加边（从连接线推断）
  for (const connector of connectors) {
    try {
      const state = connector.getState() as {
        mode?: string;
        fromId?: string | number;
        toId?: string | number;
      };

      if (state.mode === "node" && state.fromId !== undefined && state.toId !== undefined) {
        const fromId = String(state.fromId);
        const toId = String(state.toId);

        // 只添加两端都在选中节点中的边
        if (g.hasNode(fromId) && g.hasNode(toId)) {
          g.setEdge(fromId, toId);
        }
      }
    } catch {
      // 忽略无法获取状态的连接线
    }
  }

  // 如果没有边，尝试根据位置推断连接关系
  if (g.edgeCount() === 0 && nodes.length > 1) {
    inferEdgesFromPositions(g, nodes, opts.direction);
  }

  // 执行布局
  try {
    dagre.layout(g);
  } catch (error) {
    return {
      success: false,
      message: `布局计算失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }

  // 应用布局结果
  let movedCount = 0;
  for (const node of nodes) {
    const id = String(node.innerId);
    const nodeData = g.node(id);
    if (!nodeData) continue;

    // dagre 返回的是中心点坐标，需要转换为左上角
    const newX = nodeData.x - (node.width || 120) / 2;
    const newY = nodeData.y - (node.height || 60) / 2;

    // 只有位置变化时才标记移动
    if (Math.abs(node.x - newX) > 1 || Math.abs(node.y - newY) > 1) {
      node.x = newX;
      node.y = newY;
      movedCount++;
    }
  }

  if (movedCount === 0) {
    return { success: true, message: "布局已是最优，无需调整" };
  }

  return {
    success: true,
    message: `已自动布局 ${movedCount} 个节点`,
    movedCount,
  };
}

// 根据位置推断连接关系
function inferEdgesFromPositions(
  g: dagre.graphlib.Graph,
  nodes: IUI[],
  direction: string,
) {
  const sorted = [...nodes].sort((a, b) => {
    if (direction === "TB" || direction === "BT") {
      return (a.y || 0) - (b.y || 0);
    }
    return (a.x || 0) - (b.x || 0);
  });

  // 简单策略：将相邻层级的节点连接起来
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentId = String(current.innerId);
    const nextId = String(next.innerId);

    // 检查是否在同一层级
    const isSameRank = direction === "TB" || direction === "BT"
      ? Math.abs((current.y || 0) - (next.y || 0)) < 20
      : Math.abs((current.x || 0) - (next.x || 0)) < 20;

    if (!isSameRank) {
      g.setEdge(currentId, nextId);
    }
  }
}

// 布局预设
export const LAYOUT_PRESETS = {
  "top-to-bottom": {
    direction: "TB" as const,
    label: "从上到下",
    description: "适合流程图",
  },
  "left-to-right": {
    direction: "LR" as const,
    label: "从左到右",
    description: "适合组织架构图",
  },
  "bottom-to-top": {
    direction: "BT" as const,
    label: "从下到上",
    description: "适合反向流程",
  },
  "right-to-left": {
    direction: "RL" as const,
    label: "从右到左",
    description: "适合 RTL 布局",
  },
};
