export type LintSeverity = "error" | "warning";

export interface FlowUnclosedMeta {
  breakpointId: string;
  pathHint: string;
  pathIds: string[];
}

export interface LintIssueMeta {
  flowUnclosed?: FlowUnclosedMeta;
}

export interface LintIssue {
  id: string;
  ruleId: string;
  severity: LintSeverity;
  message: string;
  targetIds: string[];
  fixable?: boolean;
  meta?: LintIssueMeta;
}

export interface LintResult {
  success: boolean;
  message: string;
  issues: LintIssue[];
}

export interface DiagramLintUpdatedEventDetail {
  issues: LintIssue[];
  generatedAt: number;
}

export interface DiagramLintCachePayload {
  issues: LintIssue[];
  generatedAt: number;
}

export interface LintFixSummary {
  mode: "issue" | "next" | "pipeline" | "all" | "rule";
  fixedCount: number;
  skippedCount: number;
  remainingCount: number;
  touchedRules: string[];
  note?: string;
}
