import type { Ref } from "vue";
import type { Editor } from "@/editor";
import type { LintFixSummary } from "@/editor/builtin/plugins/diagram-lint/types";

type LogLevel = "info" | "success" | "warning" | "error";

interface EditorLogRef {
    addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

interface UseDiagramLintActionsOptions {
    editor: Ref<Editor | undefined>;
    logRef: Ref<EditorLogRef | null>;
    diagramLintFixSummary: Ref<LintFixSummary | null>;
}

type CommandResult = {
    success: boolean;
    message: string;
    summary?: LintFixSummary;
    nextIssueId?: string;
};

export function useDiagramLintActions(options: UseDiagramLintActionsOptions) {
    async function execute(command: string): Promise<CommandResult | undefined> {
        const currentEditor = options.editor.value;
        if (!currentEditor) return undefined;

        const result = (await currentEditor.commands.execute(command)) as CommandResult;
        if (result.summary) {
            options.diagramLintFixSummary.value = result.summary;
        }
        return result;
    }

    function logResult(result: CommandResult, successLevel: LogLevel) {
        options.logRef.value?.addLog({
            message: result.message,
            level: result.success ? successLevel : "warning",
        });
    }

    async function handleLintFocus(issueId: string) {
        const result = await execute(`diagramLint.focus.issue:${encodeURIComponent(issueId)}`);
        if (!result) return;
        logResult(result, "info");
    }

    async function handleLintFix(issueId: string) {
        const result = await execute(`diagramLint.fix.issue:${encodeURIComponent(issueId)}`);
        if (!result) return;
        logResult(result, "success");
    }

    async function handleLintFixNext(issueId: string) {
        const result = await execute(`diagramLint.fix.next:${encodeURIComponent(issueId)}`);
        if (!result) return;
        logResult(result, "success");

        if (result.success && result.nextIssueId) {
            await handleLintFocus(result.nextIssueId);
        }
    }

    async function handleLintFixPipeline() {
        const result = await execute("diagramLint.fix.pipeline");
        if (!result) return;
        logResult(result, "success");
    }

    async function handleLintFixAll() {
        const result = await execute("diagramLint.fix.all");
        if (!result) return;
        logResult(result, "success");
    }

    async function handleLintFixRule(ruleId: string) {
        const result = await execute(`diagramLint.fix.rule:${encodeURIComponent(ruleId)}`);
        if (!result) return;
        logResult(result, "success");
    }

    async function handleLintFocusPathNode(payload: { issueId: string; nodeId: string }) {
        const result = await execute(
            `diagramLint.focus.pathNode:${encodeURIComponent(payload.issueId)}:${encodeURIComponent(payload.nodeId)}`,
        );
        if (!result) return;
        logResult(result, "info");
    }

    return {
        handleLintFocus,
        handleLintFix,
        handleLintFixNext,
        handleLintFixPipeline,
        handleLintFixAll,
        handleLintFixRule,
        handleLintFocusPathNode,
    };
}
