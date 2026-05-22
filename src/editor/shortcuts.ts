import { onMounted, onUnmounted } from "vue";
import type { IExecuteCommand } from "./types";
import { TOOL_NAME, ACTION_NAME } from "./constants";

type ToolHandler = (cmd: IExecuteCommand) => void;
type ActionHandler = (action: string) => void;

interface ShortcutOptions {
  onTool: ToolHandler;
  onAction: ActionHandler;
}

export function useEditorShortcuts(options: ShortcutOptions) {
  const { onTool, onAction } = options;
  let currentTool = TOOL_NAME.SELECT;

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

      if (key === "v" && !shiftKey) {
        e.preventDefault();
        onAction(ACTION_NAME.PASTE);
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
      switch (key) {
        case "v":
        case "escape":
          switchTool(TOOL_NAME.SELECT);
          break;
        case "r":
          switchTool(TOOL_NAME.DRAW_RECT);
          break;
        case "d":
          switchTool(TOOL_NAME.DRAW_DIAMOND);
          break;
        case "u":
          switchTool(TOOL_NAME.DRAW_TRIANGLE);
          break;
        case "x":
          switchTool(TOOL_NAME.DRAW_HEXAGON);
          break;
        case "o":
        case "c":
          switchTool(TOOL_NAME.DRAW_CIRCLE);
          break;
        case "a":
        case "l":
          switchTool(TOOL_NAME.DRAW_ARROW);
          break;
        case "p":
          switchTool(TOOL_NAME.DRAW_FREEHAND);
          break;
        case "t":
          switchTool(TOOL_NAME.DRAW_TEXT);
          break;
        case "1":
          switchTool(TOOL_NAME.FLOW_START_END);
          break;
        case "2":
          switchTool(TOOL_NAME.FLOW_PROCESS);
          break;
        case "3":
          switchTool(TOOL_NAME.FLOW_DECISION);
          break;
        case "4":
          switchTool(TOOL_NAME.FLOW_IO);
          break;
        case "5":
          switchTool(TOOL_NAME.FLOW_DOCUMENT);
          break;
        case "6":
          switchTool(TOOL_NAME.FLOW_DATABASE);
          break;
        case "7":
          switchTool(TOOL_NAME.FLOW_SUBPROCESS);
          break;
        case "8":
          switchTool(TOOL_NAME.FLOW_CONNECTOR);
          break;
        case "9":
          switchTool(TOOL_NAME.FLOW_SWIMLANE);
          break;
        case "delete":
        case "backspace":
          e.preventDefault();
          onAction(ACTION_NAME.DELETE);
          break;
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
