import { TOOL_NAME } from "../constants";

/** Default tool id → key (lowercase, no modifiers). */
export const DEFAULT_TOOL_SHORTCUT_BY_ID: Partial<Record<string, string>> = {
  [TOOL_NAME.SELECT]: "v",
  [TOOL_NAME.DRAW_RECT]: "r",
  [TOOL_NAME.DRAW_CIRCLE]: "c",
  [TOOL_NAME.DRAW_DIAMOND]: "d",
  [TOOL_NAME.DRAW_TRIANGLE]: "u",
  [TOOL_NAME.DRAW_PARALLELOGRAM]: "g",
  [TOOL_NAME.DRAW_STAR]: "y",
  [TOOL_NAME.DRAW_NOTE]: "n",
  [TOOL_NAME.DRAW_CYLINDER]: "o",
  [TOOL_NAME.DRAW_HEXAGON]: "x",
  [TOOL_NAME.DRAW_ARROW]: "a",
  [TOOL_NAME.DRAW_TEXT]: "t",
  [TOOL_NAME.DRAW_FREEHAND]: "p",
  [TOOL_NAME.FLOW_START_END]: "1",
  [TOOL_NAME.FLOW_PROCESS]: "2",
  [TOOL_NAME.FLOW_DECISION]: "3",
  [TOOL_NAME.FLOW_IO]: "4",
  [TOOL_NAME.FLOW_DOCUMENT]: "5",
  [TOOL_NAME.FLOW_DATABASE]: "6",
  [TOOL_NAME.FLOW_SUBPROCESS]: "7",
  [TOOL_NAME.FLOW_CONNECTOR]: "8",
  [TOOL_NAME.FLOW_SWIMLANE]: "9",
};

/** Uppercase label for toolbar tips (e.g. "R"). */
export function getToolShortcutLabel(tool: string): string | undefined {
  const key = DEFAULT_TOOL_SHORTCUT_BY_ID[tool];
  return key ? key.toUpperCase() : undefined;
}

export function buildDefaultToolShortcutEntries(): Array<{
  key: string;
  action: string;
  type: "tool";
}> {
  const entries = Object.entries(DEFAULT_TOOL_SHORTCUT_BY_ID).map(([action, key]) => ({
    key: key!,
    action,
    type: "tool" as const,
  }));

  entries.push({ key: "escape", action: TOOL_NAME.SELECT, type: "tool" });
  return entries;
}
