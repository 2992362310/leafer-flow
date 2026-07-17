import type { Ref } from "vue";
import type { Editor } from "@/editor";
import { useEditorShortcuts } from "@/editor/shortcuts";
import { TOOL_NAME } from "@/editor/constants";
import type { CommandResult } from "@/editor/api/command";
import type { IExecuteArg, IExecuteCommand } from "@/editor/types";

type LogLevel = "info" | "success" | "warning" | "error";

interface EditorLogRef {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

export interface PageCommands {
  activateTool(command: string, pre?: string): void;
  handleTool(evt: IExecuteCommand): void;
  handleAction(action: string): Promise<void>;
  resetToSelectTool(): void;
  setCurrentTool(tool: string): void;
}

interface UseEditorCommandsOptions {
  editor: Ref<Editor | undefined>;
  logRef: Ref<EditorLogRef | null>;
  activeTool: Ref<string>;
  toolShortcuts: Ref<Record<string, string>>;
  refreshEditorStats: (editor: Editor) => void;
}

export function useEditorCommands({
  editor,
  logRef,
  activeTool,
  toolShortcuts,
  refreshEditorStats,
}: UseEditorCommandsOptions): PageCommands {
  const { syncCurrentTool } = useEditorShortcuts({
    onTool: handleTool,
    onAction: handleAction,
    resolveToolShortcut: (key) => toolShortcuts.value[key],
  });

  function setCurrentTool(tool: string) {
    activeTool.value = tool;
    syncCurrentTool(tool);
  }

  function executeCallback<T>(arg: T) {
    const { action, tool, next } = arg as IExecuteArg;
    logRef.value?.addLog({
      message: `${tool} ${action}`,
      command: tool,
      level: next ? "error" : "success",
    });

    setCurrentTool(next ?? TOOL_NAME.SELECT);
  }

  function handleTool(evt: IExecuteCommand) {
    if (!editor.value) return;
    setCurrentTool(evt.command);
    editor.value.execute(evt, executeCallback);
    logRef.value?.addLog({ message: `开始执行工具: ${evt.command}`, level: "info" });
  }

  function activateTool(command: string, pre?: string) {
    handleTool({
      command,
      pre: pre ?? activeTool.value,
    });
  }

  function logResult(result: CommandResult, warning = true) {
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? "success" : warning ? "warning" : "error",
    });
  }

  async function handleAction(action: string) {
    const currentEditor = editor.value;
    if (!currentEditor) return;

    logRef.value?.addLog({ message: `执行操作: ${action}` });
    const result = await currentEditor.commands.execute(action);
    logResult(result, result.warning);
    if (result.refreshZoom) refreshEditorStats(currentEditor);
  }

  function resetToSelectTool() {
    setCurrentTool(TOOL_NAME.SELECT);
  }

  return {
    activateTool,
    handleTool,
    handleAction,
    resetToSelectTool,
    setCurrentTool,
  };
}
