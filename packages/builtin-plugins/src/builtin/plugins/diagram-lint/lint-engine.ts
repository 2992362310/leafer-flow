import type { IUI } from "leafer";
import type Editor from "@leafer-flow/core/editor";
import { Connector } from "@leafer-flow/core/core/connector";
import type { LintIssue, LintResult } from "./types";

type NodeLike = IUI;

interface GraphStats {
  inbound: Map<string, number>;
  outbound: Map<string, number>;
  adjacency: Map<string, Set<string>>;
}

interface TextCarrier { text?: unknown }

function collectVisibleNodes(editor: Editor): NodeLike[] {
  const children = (editor.app.tree.children ?? []) as IUI[];
  const nodes = children.filter((item) => !(item instanceof Connector)) as NodeLike[];
  return nodes.filter((node) => node.visible !== false);
}

function toId(input: string | number): string {
  return String(input);
}

function overlaps(a: { x?: number; y?: number; width?: number; height?: number }, b: { x?: number; y?: number; width?: number; height?: number }): boolean {
  const ax = a.x ?? 0;
  const ay = a.y ?? 0;
  const aw = a.width ?? 0;
  const ah = a.height ?? 0;

  const bx = b.x ?? 0;
  const by = b.y ?? 0;
  const bw = b.width ?? 0;
  const bh = b.height ?? 0;

  if (aw <= 0 || ah <= 0 || bw <= 0 || bh <= 0) return false;

  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function collectConnectionStats(editor: Editor): GraphStats {
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const children = (editor.app.tree.children ?? []) as IUI[];

  for (const item of children) {
    if (!(item instanceof Connector)) continue;

    try {
      const state = item.getState() as { fromId?: string | number; toId?: string | number; mode?: string };
      if (state.mode !== "node") continue;

      if (state.fromId !== undefined) {
        const key = toId(state.fromId);
        outbound.set(key, (outbound.get(key) ?? 0) + 1);
      }

      if (state.toId !== undefined) {
        const key = toId(state.toId);
        inbound.set(key, (inbound.get(key) ?? 0) + 1);
      }

      if (state.fromId !== undefined && state.toId !== undefined) {
        const from = toId(state.fromId);
        const to = toId(state.toId);

        const next = adjacency.get(from) ?? new Set<string>();
        next.add(to);
        adjacency.set(from, next);
      }
    } catch {
      // ignore connector with invalid state
    }
  }

  return { inbound, outbound, adjacency };
}

function analyzeReachability(
  start: string,
  endIds: Set<string>,
  adjacency: Map<string, Set<string>>,
): { reachable: true } | { reachable: false; breakpointId: string; pathHint: string; pathIds: string[] } {
  const queue = [start];
  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();
  const depth = new Map<string, number>([[start, 0]]);
  const deadEnds: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current !== start && endIds.has(current)) {
      return { reachable: true };
    }

    const nextNodes = adjacency.get(current);
    if (!nextNodes || nextNodes.size === 0) {
      deadEnds.push(current);
      continue;
    }

    nextNodes.forEach((next) => {
      if (visited.has(next)) return;
      visited.add(next);
      parent.set(next, current);
      depth.set(next, (depth.get(current) ?? 0) + 1);
      queue.push(next);
    });
  }

  const candidates = deadEnds.length > 0 ? deadEnds : Array.from(visited);
  const breakpointId = candidates.reduce((best, current) => {
    if (!best) return current;
    return (depth.get(current) ?? 0) > (depth.get(best) ?? 0) ? current : best;
  }, "");

  const chain: string[] = [];
  let node = breakpointId;
  while (node) {
    chain.push(node);
    const nextParent = parent.get(node);
    if (!nextParent) break;
    node = nextParent;
  }
  chain.reverse();

  const compactPath =
    chain.length <= 5
      ? chain.join(" -> ")
      : `${chain.slice(0, 2).join(" -> ")} -> ... -> ${chain.slice(-2).join(" -> ")}`;

  return {
    reachable: false,
    breakpointId,
    pathHint: compactPath,
    pathIds: chain,
  };
}

export function runDiagramLint(editor: Editor): LintResult {
  const nodes = collectVisibleNodes(editor);
  if (!nodes.length) {
    return { success: false, message: "画布为空，暂无可检查内容", issues: [] };
  }

  const issues: LintIssue[] = [];
  const names = new Map<string, string[]>();
  const nodeMap = new Map<string, NodeLike>();

  for (const node of nodes) {
    const name = String((node as unknown as TextCarrier).text ?? "").trim();
    nodeMap.set(toId(node.innerId), node);
    if (!name) continue;
    const key = name.toLowerCase();
    const list = names.get(key) ?? [];
    list.push(toId(node.innerId));
    names.set(key, list);
  }

  names.forEach((ids, key) => {
    if (ids.length < 2) return;
    issues.push({
      id: `duplicate-name:${key}`,
      ruleId: "duplicate-name",
      severity: "warning",
      message: `存在重复节点名称：${key}`,
      targetIds: ids,
    });
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!overlaps(a, b)) continue;
      issues.push({
        id: `overlap:${toId(a.innerId)}:${toId(b.innerId)}`,
        ruleId: "node-overlap",
        severity: "error",
        message: "检测到节点重叠",
        targetIds: [toId(a.innerId), toId(b.innerId)],
        fixable: true,
      });
    }
  }

  const stats = collectConnectionStats(editor);
  const nodeIds = nodes.map((node) => toId(node.innerId));
  const startIds = new Set(nodeIds.filter((id) => (stats.inbound.get(id) ?? 0) === 0 && (stats.outbound.get(id) ?? 0) > 0));
  const endIds = new Set(nodeIds.filter((id) => (stats.outbound.get(id) ?? 0) === 0 && (stats.inbound.get(id) ?? 0) > 0));

  startIds.forEach((startId) => {
    const analysis = analyzeReachability(startId, endIds, stats.adjacency);
    if (!analysis.reachable) {
      issues.push({
        id: `flow-unclosed:${startId}`,
        ruleId: "flow-unclosed",
        severity: "error",
        message: `流程未闭环：起点无法到达任何终点（疑似断点：${analysis.breakpointId}；路径：${analysis.pathHint})`,
        targetIds: [startId, analysis.breakpointId],
        meta: {
          flowUnclosed: {
            breakpointId: analysis.breakpointId,
            pathHint: analysis.pathHint,
            pathIds: analysis.pathIds,
          },
        },
      });
    }
  });

  nodes.forEach((node) => {
    const id = toId(node.innerId);
    const inbound = stats.inbound.get(id) ?? 0;
    const outbound = stats.outbound.get(id) ?? 0;
    const labelText = String((node as unknown as TextCarrier).text ?? "").trim();

    if (inbound === 0 && outbound === 0) {
      issues.push({
        id: `isolated:${id}`,
        ruleId: "isolated-node",
        severity: "warning",
        message: "检测到孤立节点（无入线无出线）",
        targetIds: [id],
      });
      return;
    }

    if (inbound === 0) {
      issues.push({
        id: `no-inbound:${id}`,
        ruleId: "no-inbound",
        severity: "warning",
        message: "检测到无入线节点",
        targetIds: [id],
      });
    }

    if (outbound === 0) {
      issues.push({
        id: `no-outbound:${id}`,
        ruleId: "no-outbound",
        severity: "warning",
        message: "检测到无出线节点",
        targetIds: [id],
      });
    }

    if (inbound > 0 && outbound > 0 && Math.abs(inbound - outbound) >= 2) {
      issues.push({
        id: `flow-unbalanced:${id}`,
        ruleId: "flow-unbalanced",
        severity: "warning",
        message: "流程节点入线/出线差异较大，建议检查分支完整性",
        targetIds: [id],
      });
    }

    if (labelText.length > 24) {
      issues.push({
        id: `text-too-long:${id}`,
        ruleId: "text-too-long",
        severity: "warning",
        message: "节点文本较长，建议精简文案",
        targetIds: [id],
        fixable: true,
      });
    }
  });

  const message = issues.length
    ? `检测完成，共发现 ${issues.length} 条问题`
    : "检测完成，未发现明显问题";

  return {
    success: true,
    message,
    issues,
  };
}

export function fixNodeOverlaps(editor: Editor): { success: boolean; message: string } {
  const document = editor.document.snapshot();
  const nodes = document.nodes.filter((node) => node.data.visible !== false);
  if (nodes.length < 2) {
    return { success: false, message: "节点数量不足，无需修复重叠" };
  }

  const gap = 32;
  let moved = 0;

  const positions = new Map(nodes.map((node) => [node.id, {
    x: Number(node.data.x ?? 0),
    y: Number(node.data.y ?? 0),
    width: Number(node.data.width ?? 0),
    height: Number(node.data.height ?? 0),
  }]));

  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i]!;
    if (current.data.locked) continue;

    for (let j = 0; j < i; j++) {
      const prev = nodes[j]!;
      const currentBox = positions.get(current.id)!;
      const previousBox = positions.get(prev.id)!;
      if (!overlaps(currentBox, previousBox)) continue;

      currentBox.x = previousBox.x + (previousBox.width || 120) + gap;
      currentBox.y += gap;
      moved++;
    }
  }

  if (!moved) {
    return { success: false, message: "未发现可修复的节点重叠" };
  }

  editor.documentCommands.updateNodes(Object.fromEntries([...positions].map(([id, position]) => [id, { x: position.x, y: position.y }])));
  return { success: true, message: `已修复 ${moved} 处节点重叠` };
}

export function fixTextTooLong(
  editor: Editor,
  targetIds?: string[],
): { success: boolean; message: string } {
  const runtimeNodes = collectVisibleNodes(editor);
  const nodes = editor.document.snapshot().nodes;
  const targetSet = new Set((targetIds ?? []).map((id) => String(id)));
  const patches: Record<string, { text: string }> = {};
  for (const runtime of runtimeNodes) {
    const id = editor.renderer.getId(runtime);
    if (targetSet.size > 0 && !targetSet.has(toId(runtime.innerId)) && !targetSet.has(id)) continue;
    const node = nodes.find((item) => item.id === id);
    if (!node || node.data.locked) continue;

    const textNode = findDocumentText(node);
    const text = String(textNode?.data.text ?? "").trim();
    if (text.length <= 24) continue;
    patches[id] = { text: `${text.slice(0, 21)}...` };
  }

  const fixedCount = Object.keys(patches).length;
  if (!fixedCount) {
    return { success: false, message: "未发现可修复的长文本节点" };
  }

  editor.documentCommands.updatePresentations(patches);
  return { success: true, message: `已精简 ${fixedCount} 个节点文案` };
}

function findDocumentText(node: import("@leafer-flow/core").DocumentNode): import("@leafer-flow/core").DocumentNode | undefined {
  if (node.type === "Text" || node.type === "leafer-flow.flow-node") return node;
  for (const child of node.children) {
    const result = findDocumentText(child);
    if (result) return result;
  }
}

export function listIssueMessages(result: LintResult): string[] {
  return result.issues.map((issue) => `${issue.severity === "error" ? "[严重]" : "[提示]"} ${issue.message}`);
}
