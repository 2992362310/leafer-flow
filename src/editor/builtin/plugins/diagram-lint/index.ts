import type { EditorPluginModule } from "../../../api/plugin";
import type { IUI } from "leafer";
import { fixNodeOverlaps, fixTextTooLong, runDiagramLint } from "./lint-engine";
import type { DiagramLintCachePayload, DiagramLintUpdatedEventDetail, LintFixSummary, LintIssue } from "./types";

const PLUGIN_ID = "leafer-flow.diagram-lint";
const ISSUE_STORAGE_KEY = "latest-issues";
const EVENT_NAME = "leafer-flow:diagram-lint-updated";
const CACHE_KEY = "leafer-flow:diagram-lint-cache";

function saveIssueCache(payload: DiagramLintCachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failure
  }
}

function readIssueCache(): DiagramLintCachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagramLintCachePayload;
    if (!Array.isArray(parsed.issues) || typeof parsed.generatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function dispatchIssueUpdate(issues: LintIssue[]) {
  const generatedAt = Date.now();
  saveIssueCache({ issues, generatedAt });
  window.dispatchEvent(
    new CustomEvent<DiagramLintUpdatedEventDetail>(EVENT_NAME, {
      detail: {
        issues,
        generatedAt,
      },
    }),
  );
}

function findByIds(items: IUI[], ids: Set<string>): IUI[] {
  const found: IUI[] = [];

  function visit(nodes: IUI[]) {
    for (const node of nodes) {
      const nodeId = String((node as { innerId?: string | number }).innerId ?? "");
      if (ids.has(nodeId)) {
        found.push(node);
      }

      const children = (node as unknown as { children?: IUI[] }).children;
      if (children?.length) visit(children);
    }
  }

  visit(items);
  return found;
}

function findPathConnectors(items: IUI[], pathIds: string[]): IUI[] {
  if (pathIds.length < 2) return [];
  const pairSet = new Set<string>();
  for (let i = 0; i < pathIds.length - 1; i++) {
    pairSet.add(`${pathIds[i]}->${pathIds[i + 1]}`);
  }

  const connectors: IUI[] = [];
  for (const item of items) {
    if (!(item instanceof Connector)) continue;
    try {
      const state = item.getState() as { fromId?: string | number; toId?: string | number; mode?: string };
      if (state.mode !== "node" || state.fromId === undefined || state.toId === undefined) continue;
      const pair = `${String(state.fromId)}->${String(state.toId)}`;
      if (pairSet.has(pair)) connectors.push(item);
    } catch {
      // ignore connector with invalid state
    }
  }
  return connectors;
}

export const diagramLintPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "规范检查 Pro",
    version: "0.1.0",
    description: "检测流程图常见问题并提供基础修复能力。",
    category: "utility",
    capabilities: ["command", "action-button"],
    enabledByDefault: true,
  },
  contributes: {
    commands: [
      "规范检查",
      "修复节点重叠",
      "修复长文本",
      "修复全部可修复问题",
      "按规则修复",
      "修复并下一条",
      "自动修复流水线",
      "查看最近检查结果",
      "定位规范问题",
      "按问题修复",
      "定位路径节点",
    ],
    buttons: ["规范检查 Pro"],
  },
  activate(ctx) {
    const executeIssueFix = (
      editor: Parameters<Parameters<typeof ctx.editor.commands.register>[0]["run"]>[0],
      issue: LintIssue,
    ) => {
      if (issue.ruleId === "node-overlap") return fixNodeOverlaps(editor);
      if (issue.ruleId === "text-too-long") return fixTextTooLong(editor, issue.targetIds);
      return { success: false, message: "该问题暂不支持自动修复" };
    };

    const cached = readIssueCache();
    if (cached) {
      ctx.storage.set(ISSUE_STORAGE_KEY, cached.issues);
      window.dispatchEvent(
        new CustomEvent<DiagramLintUpdatedEventDetail>(EVENT_NAME, {
          detail: cached,
        }),
      );
    }

    ctx.editor.commands.register({
      id: "diagramLint.run",
      label: "规范检查",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const result = runDiagramLint(editor);
        ctx.storage.set(ISSUE_STORAGE_KEY, result.issues);
        dispatchIssueUpdate(result.issues);
        return {
          success: result.success,
          message: result.message,
          warning: result.issues.length > 0,
        };
      },
    });

    ctx.editor.commands.register({
      id: "diagramLint.fix.overlap",
      label: "修复节点重叠",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const result = fixNodeOverlaps(editor);
        if (result.success) {
          const lintResult = runDiagramLint(editor);
          ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
          dispatchIssueUpdate(lintResult.issues);
        }
        return result;
      },
    });

    ctx.editor.commands.register({
      id: "diagramLint.fix.text",
      label: "修复长文本",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const result = fixTextTooLong(editor);
        if (result.success) {
          const lintResult = runDiagramLint(editor);
          ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
          dispatchIssueUpdate(lintResult.issues);
        }
        return result;
      },
    });

    ctx.editor.commands.register({
      id: "diagramLint.report",
      label: "查看最近检查结果",
      pluginId: PLUGIN_ID,
      run: () => {
        const issues = ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null;

        if (!issues || issues.length === 0) {
          return { success: false, message: "暂无检查结果，请先执行规范检查" };
        }

        const errorCount = issues.filter((issue) => issue.severity === "error").length;
        const warningCount = issues.length - errorCount;
        const fixableCount = issues.filter((issue) => issue.fixable).length;

        const topRules = Array.from(
          issues.reduce((map, issue) => {
            map.set(issue.ruleId, (map.get(issue.ruleId) ?? 0) + 1);
            return map;
          }, new Map<string, number>()),
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([ruleId, count]) => `${ruleId}x${count}`)
          .join("，");

        const lines = issues
          .slice(0, 6)
          .map((issue) => `${issue.severity === "error" ? "[严重]" : "[提示]"} ${issue.message}`)
          .join("；");

        const extra = issues.length > 6 ? `（另有 ${issues.length - 6} 条）` : "";
        return {
          success: true,
          message: `共 ${issues.length} 条（严重 ${errorCount} / 提示 ${warningCount} / 可修复 ${fixableCount}）；规则Top: ${topRules || "--"}；${lines}${extra}`,
        };
      },
    });

    ctx.editor.commands.register<{ issueId: string }>({
      id: "diagramLint.focus.issue",
      label: "定位规范问题",
      pluginId: PLUGIN_ID,
      match: (action) => {
        const match = /^diagramLint\.focus\.issue:(.+)$/.exec(action);
        if (!match) return null;
        return { issueId: decodeURIComponent(match[1]) };
      },
      run: (editor, payload) => {
        if (!payload?.issueId) return { success: false, message: "无效的问题标识" };

        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        const issue = issues.find((item) => item.id === payload.issueId);
        if (!issue || issue.targetIds.length === 0) {
          return { success: false, message: "未找到对应问题或目标节点" };
        }

        const allItems = (editor.app.tree.children ?? []) as IUI[];
        const targets = findByIds(allItems, new Set(issue.targetIds));
        if (targets.length === 0) {
          return { success: false, message: "目标节点不存在，可能已被删除" };
        }

        const pathIds = issue.meta?.flowUnclosed?.pathIds ?? [];
        const pathNodes = pathIds.length ? findByIds(allItems, new Set(pathIds)) : [];
        const pathConnectors = pathIds.length ? findPathConnectors(allItems, pathIds) : [];
        const mergedTargets = Array.from(new Set([...targets, ...pathNodes, ...pathConnectors]));

        editor.app.editor.select(mergedTargets);
        const first = targets[0] ?? mergedTargets[0];
        try {
          const bounds = first.getBounds("box", "page");
          editor.app.zoom("fit", {
            padding: [120, 120, 120, 120],
            fixed: {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            },
          } as never);
        } catch {
          // ignore focus viewport failure and keep selection result
        }

        const pathHint = pathConnectors.length > 0
          ? `，已高亮 ${pathNodes.length} 个路径节点和 ${pathConnectors.length} 条路径连线`
          : "";
        return { success: true, message: `已定位问题：${issue.message}${pathHint}` };
      },
    });

    ctx.editor.commands.register<{ issueId: string }>({
      id: "diagramLint.fix.issue",
      label: "按问题修复",
      pluginId: PLUGIN_ID,
      match: (action) => {
        const match = /^diagramLint\.fix\.issue:(.+)$/.exec(action);
        if (!match) return null;
        return { issueId: decodeURIComponent(match[1]) };
      },
      run: (editor, payload) => {
        if (!payload?.issueId) return { success: false, message: "无效的问题标识" };

        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        const issue = issues.find((item) => item.id === payload.issueId);
        if (!issue) return { success: false, message: "未找到对应问题" };

        const result = executeIssueFix(editor, issue);

        if (result.success) {
          const lintResult = runDiagramLint(editor);
          ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
          dispatchIssueUpdate(lintResult.issues);

          const summary: LintFixSummary = {
            mode: "issue",
            fixedCount: 1,
            skippedCount: 0,
            remainingCount: lintResult.issues.length,
            touchedRules: [issue.ruleId],
          };

          return { ...result, summary };
        }

        return result;
      },
    });

    ctx.editor.commands.register<{ issueId: string }>({
      id: "diagramLint.fix.next",
      label: "修复并下一条",
      pluginId: PLUGIN_ID,
      match: (action) => {
        const match = /^diagramLint\.fix\.next:(.+)$/.exec(action);
        if (!match) return null;
        return { issueId: decodeURIComponent(match[1]) };
      },
      run: (editor, payload) => {
        const issueId = payload?.issueId;
        if (!issueId) return { success: false, message: "无效的问题标识" };

        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        const current = issues.find((item) => item.id === issueId);
        if (!current) return { success: false, message: "未找到当前问题" };

        const fixResult = executeIssueFix(editor, current);
        if (!fixResult.success) return fixResult;

        const lintResult = runDiagramLint(editor);
        ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
        dispatchIssueUpdate(lintResult.issues);

        const nextFixable = lintResult.issues.find((item) => item.fixable);
        const summary: LintFixSummary = {
          mode: "next",
          fixedCount: 1,
          skippedCount: 0,
          remainingCount: lintResult.issues.length,
          touchedRules: [current.ruleId],
        };
        if (!nextFixable) {
          return { success: true, message: `${fixResult.message}；已无可修复问题`, summary };
        }

        return {
          success: true,
          message: `${fixResult.message}；下一条可修复问题：${nextFixable.ruleId}`,
          nextIssueId: nextFixable.id,
          summary,
        };
      },
    });

    ctx.editor.commands.register<{ limit?: number }>({
      id: "diagramLint.fix.pipeline",
      label: "自动修复流水线",
      pluginId: PLUGIN_ID,
      run: (editor, payload) => {
        const limit = Math.max(1, Math.min(50, Number(payload?.limit ?? 10)));
        let rounds = 0;
        let totalFixed = 0;
        let skippedCount = 0;
        const messages: string[] = [];
        const touchedRules = new Set<string>();
        const skippedRules = new Set<string>();

        while (rounds < limit) {
          const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
          const nextIssue = issues.find((item) => item.fixable);
          if (!nextIssue) break;

          const result = executeIssueFix(editor, nextIssue);
          if (!result.success) {
            skippedCount += 1;
            skippedRules.add(nextIssue.ruleId);

            const lintResult = runDiagramLint(editor);
            const filtered = lintResult.issues.filter((item) => item.id !== nextIssue.id);
            ctx.storage.set(ISSUE_STORAGE_KEY, filtered);
            dispatchIssueUpdate(filtered);

            rounds += 1;
            messages.push(result.message);
            continue;
          }

          totalFixed += 1;
          rounds += 1;
          touchedRules.add(nextIssue.ruleId);
          messages.push(result.message);

          const lintResult = runDiagramLint(editor);
          ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
          dispatchIssueUpdate(lintResult.issues);
        }

        const remaining = ((ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? []).length;
        const summary: LintFixSummary = {
          mode: "pipeline",
          fixedCount: totalFixed,
          skippedCount,
          remainingCount: remaining,
          touchedRules: Array.from(touchedRules),
          note: skippedRules.size ? `已跳过不可修复规则：${Array.from(skippedRules).join("，")}` : undefined,
        };

        if (totalFixed === 0) {
          return {
            success: false,
            message: messages[0] ?? "当前无可自动修复问题",
            summary,
          };
        }

        return {
          success: true,
          message: `流水线完成：共修复 ${totalFixed} 条，跳过 ${skippedCount} 条；${messages.slice(0, 3).join("；")}`,
          summary,
        };
      },
    });

    ctx.editor.commands.register({
      id: "diagramLint.fix.all",
      label: "修复全部可修复问题",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        if (issues.length === 0) {
          return { success: false, message: "暂无检查结果，请先执行规范检查" };
        }

        const overlapIssues = issues.filter((issue) => issue.ruleId === "node-overlap");
        const textIssues = issues.filter((issue) => issue.ruleId === "text-too-long");

        let fixedAny = false;
        const messages: string[] = [];

        if (overlapIssues.length > 0) {
          const overlapResult = fixNodeOverlaps(editor);
          if (overlapResult.success) fixedAny = true;
          messages.push(overlapResult.message);
        }

        if (textIssues.length > 0) {
          const textTargetIds = Array.from(new Set(textIssues.flatMap((issue) => issue.targetIds)));
          const textResult = fixTextTooLong(editor, textTargetIds);
          if (textResult.success) fixedAny = true;
          messages.push(textResult.message);
        }

        if (!fixedAny) {
          return { success: false, message: messages[0] ?? "未发现可自动修复的问题" };
        }

        const lintResult = runDiagramLint(editor);
        ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
        dispatchIssueUpdate(lintResult.issues);

        const summary: LintFixSummary = {
          mode: "all",
          fixedCount: overlapIssues.length + textIssues.length,
          skippedCount: 0,
          remainingCount: lintResult.issues.length,
          touchedRules: [
            ...(overlapIssues.length ? ["node-overlap"] : []),
            ...(textIssues.length ? ["text-too-long"] : []),
          ],
        };

        return { success: true, message: `批量修复完成：${messages.join("；")}`, summary };
      },
    });

    ctx.editor.commands.register<{ ruleId: string }>({
      id: "diagramLint.fix.rule",
      label: "按规则修复",
      pluginId: PLUGIN_ID,
      match: (action) => {
        const match = /^diagramLint\.fix\.rule:(.+)$/.exec(action);
        if (!match) return null;
        return { ruleId: decodeURIComponent(match[1]) };
      },
      run: (editor, payload) => {
        const ruleId = payload?.ruleId;
        if (!ruleId) return { success: false, message: "无效的规则标识" };

        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        if (issues.length === 0) {
          return { success: false, message: "暂无检查结果，请先执行规范检查" };
        }

        const matched = issues.filter((issue) => issue.ruleId === ruleId);
        if (matched.length === 0) {
          return { success: false, message: `当前无规则 ${ruleId} 的问题` };
        }

        let result = { success: false, message: "该规则暂不支持自动修复" };
        if (ruleId === "node-overlap") {
          result = fixNodeOverlaps(editor);
        } else if (ruleId === "text-too-long") {
          const textTargetIds = Array.from(new Set(matched.flatMap((issue) => issue.targetIds)));
          result = fixTextTooLong(editor, textTargetIds);
        }

        if (!result.success) return result;

        const lintResult = runDiagramLint(editor);
        ctx.storage.set(ISSUE_STORAGE_KEY, lintResult.issues);
        dispatchIssueUpdate(lintResult.issues);

        const summary: LintFixSummary = {
          mode: "rule",
          fixedCount: matched.length,
          skippedCount: 0,
          remainingCount: lintResult.issues.length,
          touchedRules: [ruleId],
        };

        return { ...result, summary };
      },
    });

    ctx.editor.commands.register<{ issueId: string; nodeId: string }>({
      id: "diagramLint.focus.pathNode",
      label: "定位路径节点",
      pluginId: PLUGIN_ID,
      match: (action) => {
        const match = /^diagramLint\.focus\.pathNode:([^:]+):(.+)$/.exec(action);
        if (!match) return null;
        return {
          issueId: decodeURIComponent(match[1]),
          nodeId: decodeURIComponent(match[2]),
        };
      },
      run: (editor, payload) => {
        const issueId = payload?.issueId;
        const nodeId = payload?.nodeId;
        if (!issueId || !nodeId) return { success: false, message: "路径定位参数无效" };

        const issues = (ctx.storage.get(ISSUE_STORAGE_KEY) as LintIssue[] | null) ?? [];
        const issue = issues.find((item) => item.id === issueId);
        if (!issue) return { success: false, message: "未找到对应问题" };

        const allItems = (editor.app.tree.children ?? []) as IUI[];
        const targets = findByIds(allItems, new Set([nodeId]));
        if (targets.length === 0) return { success: false, message: "目标路径节点不存在" };

        const pathIds = issue.meta?.flowUnclosed?.pathIds ?? [];
        const currentIndex = pathIds.indexOf(nodeId);
        const localPath =
          currentIndex >= 0
            ? pathIds.slice(Math.max(0, currentIndex - 1), Math.min(pathIds.length, currentIndex + 2))
            : [nodeId];
        const localConnectors = localPath.length > 1 ? findPathConnectors(allItems, localPath) : [];
        const mergedTargets = Array.from(new Set([...targets, ...localConnectors]));

        editor.app.editor.select(mergedTargets);
        const first = targets[0] ?? mergedTargets[0];
        try {
          const bounds = first.getBounds("box", "page");
          editor.app.zoom("fit", {
            padding: [120, 120, 120, 120],
            fixed: {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            },
          } as never);
        } catch {
          // ignore focus viewport failure and keep selection result
        }

        const linkHint = localConnectors.length > 0 ? `，并高亮 ${localConnectors.length} 条相邻连线` : "";
        return { success: true, message: `已定位路径节点 ${nodeId}${linkHint}` };
      },
    });

    ctx.editor.actionButtons.register({
      id: "diagram-lint-pro",
      label: "规范检查 Pro",
      icon: "warning",
      pluginId: PLUGIN_ID,
      kind: "dropdown",
      order: 66,
      items: [
        {
          id: "diagram-lint-run",
          label: "执行规范检查",
          command: "diagramLint.run",
          icon: "warning",
          order: 10,
        },
        {
          id: "diagram-lint-fix-overlap",
          label: "修复节点重叠",
          command: "diagramLint.fix.overlap",
          icon: "success",
          order: 20,
        },
        {
          id: "diagram-lint-fix-text",
          label: "修复长文本",
          command: "diagramLint.fix.text",
          icon: "success",
          order: 25,
        },
        {
          id: "diagram-lint-fix-all",
          label: "修复全部可修复问题",
          command: "diagramLint.fix.all",
          icon: "success",
          order: 26,
        },
        {
          id: "diagram-lint-fix-pipeline",
          label: "自动修复流水线",
          command: "diagramLint.fix.pipeline",
          icon: "success",
          order: 27,
        },
        {
          id: "diagram-lint-report",
          label: "查看最近检查结果",
          command: "diagramLint.report",
          icon: "info",
          order: 30,
        },
      ],
    });
  },
};
