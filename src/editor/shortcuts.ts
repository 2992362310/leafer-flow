import { onMounted, onUnmounted } from "vue";
import type { IExecuteCommand } from "./types";
import { TOOL_NAME, ACTION_NAME } from "./constants";

type ToolHandler = (cmd: IExecuteCommand) => void;
type ActionHandler = (action: string) => void;
type ToolShortcutResolver = (key: string) => string | undefined;

interface ShortcutOptions {
  onTool: ToolHandler;
  onAction: ActionHandler;
  resolveToolShortcut?: ToolShortcutResolver;
}

export function useEditorShortcuts(options: ShortcutOptions) {
  const { onTool, onAction, resolveToolShortcut } = options;
  let currentTool: string = TOOL_NAME.SELECT;

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    const key = e.key.toLowerCase();
    const { ctrlKey, metaKey, shiftKey } = e;
    const isCmd = ctrlKey || metaKey;

    if (isCmd) {
      if (key === "z" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.UNDO);
        return;
      }

      if (key === "z" && shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.REDO);
        return;
      }

      if (key === "g" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.GROUP);
        return;
      }

      if (key === "g" && shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.UNGROUP);
        return;
      }

      if (key === "s") {
        e.preventDefault();
        onAction(ACTION_NAME.SAVE);
        return;
      }

      if (key === "a" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.SELECT_ALL);
        return;
      }

      if (key === "]") {
        e.preventDefault();
        onAction(ACTION_NAME.BRING_FORWARD);
        return;
      }

      if (key === "[") {
        e.preventDefault();
        onAction(ACTION_NAME.SEND_BACKWARD);
        return;
      }

      if (key === "}" && shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.BRING_TO_FRONT);
        return;
      }

      if (key === "{" && shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.SEND_TO_BACK);
        return;
      }

      if (key === "l" && shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.LOCK_SELECTED);
        return;
      }

      if (key === "l" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.UNLOCK_SELECTED);
        return;
      }

      if (key === "h" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.TOGGLE_VISIBLE);
        return;
      }

      if (key === "c" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.COPY);
        return;
      }

      if (key === "x" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.CUT);
        return;
      }

      if (key === "v" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.PASTE);
        return;
      }

      if (key === "d" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.DUPLICATE);
        return;
      }

      if (key === "f" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.FIND);
        return;
      }

      return;
    }

    if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown") {
      e.preventDefault();
      const delta = shiftKey ? 10 : 1;
      if (key === "arrowleft") onAction(`nudgeLeft:${delta}`);
      if (key === "arrowright") onAction(`nudgeRight:${delta}`);
      if (key === "arrowup") onAction(`nudgeUp:${delta}`);
      if (key === "arrowdown") onAction(`nudgeDown:${delta}`);
      return;
    }

    if (!shiftKey) {
      if (key === "v" || key === "escape") {
        switchTool(TOOL_NAME.SELECT);
        return;
      }

      const shortcutTool = resolveToolShortcut?.(key);
      if (shortcutTool) {
        switchTool(shortcutTool);
        return;
      }

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        onAction(ACTION_NAME.DELETE);
      }
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
