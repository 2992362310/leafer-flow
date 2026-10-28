import { onMounted, onUnmounted } from "vue";
import type { IExecuteCommand } from "@leafer-flow/core/types";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import { getShortcutConfig } from "@leafer-flow/core/core/shortcut-config";

type ToolHandler = (cmd: IExecuteCommand) => void;
type ActionHandler = (action: string) => void;
type ToolShortcutResolver = (key: string) => string | undefined;

interface ShortcutOptions {
  onTool: ToolHandler;
  onAction: ActionHandler;
  /** Fallback for tool keys contributed by the tool registry (e.g. plugins). */
  resolveToolShortcut?: ToolShortcutResolver;
}

export function useEditorShortcuts(options: ShortcutOptions) {
  const { onTool, onAction, resolveToolShortcut } = options;
  const config = getShortcutConfig();
  let currentTool: string = TOOL_NAME.SELECT;

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    const key = normalizeKey(e);
    const entry = config.getByKey(key);

    if (entry) {
      if (entry.type === "action") {
        e.preventDefault();
        onAction(entry.action);
      } else if (entry.type === "tool") {
        const activeTool = resolveToolShortcut?.(key);
        if (entry.action === TOOL_NAME.SELECT || activeTool === entry.action) {
          e.preventDefault();
          switchTool(entry.action);
        }
      }
      return;
    }

    const resolvedTool = resolveToolShortcut?.(key);
    if (resolvedTool) {
      e.preventDefault();
      switchTool(resolvedTool);
      return;
    }

    // 方向键微移（不在快捷键配置中，保持硬编码）
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") onAction(`nudgeLeft:${delta}`);
      if (e.key === "ArrowRight") onAction(`nudgeRight:${delta}`);
      if (e.key === "ArrowUp") onAction(`nudgeUp:${delta}`);
      if (e.key === "ArrowDown") onAction(`nudgeDown:${delta}`);
      return;
    }
  };

  const switchTool = (nextTool: string) => {
    if (currentTool === nextTool) return;

    onTool({
      command: nextTool,
      pre: currentTool,
    });
    currentTool = nextTool;
  };

  const syncCurrentTool = (tool: string) => {
    currentTool = tool;
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
  });

  return {
    syncCurrentTool,
  };
}

/** 将 KeyboardEvent 规范化为快捷键配置中的 key 格式 */
function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");

  let key = e.key.toLowerCase();
  // 特殊键名映射
  if (key === "escape") key = "escape";
  else if (key === "delete") key = "delete";
  else if (key === "backspace") key = "backspace";
  else if (key === "arrowleft") key = "arrowleft";
  else if (key === "arrowright") key = "arrowright";
  else if (key === "arrowup") key = "arrowup";
  else if (key === "arrowdown") key = "arrowdown";

  // 如果有修饰键，不重复添加
  if (parts.length > 0 && !parts.includes(key)) {
    parts.push(key);
  } else if (parts.length === 0) {
    parts.push(key);
  }

  return parts.join("+");
}
