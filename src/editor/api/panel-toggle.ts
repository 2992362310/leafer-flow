/** Canonical window event names for panel toggles. */
export const PANEL_TOGGLE_EVENT = {
  "layer-panel": "leafer-flow:toggle-layer-panel",
  "plugin-market": "leafer-flow:toggle-plugin-market",
  "canvas-search": "leafer-flow:toggle-search",
  "history-panel": "leafer-flow:toggle-history",
  "shortcut-help": "leafer-flow:toggle-shortcut-help",
  "agent-chat": "leafer-flow:toggle-agent",
  "minimap-panel": "leafer-flow:toggle-minimap",
  "multi-layer-panel": "leafer-flow:toggle-multi-layer-panel",
  "drawing-settings": "leafer-flow:toggle-drawing-settings",
  "template-market": "leafer-flow:toggle-template-market",
  "align-panel": "leafer-flow:toggle-align-panel",
  "layer-tools-panel": "leafer-flow:toggle-layer-tools-panel",
  "export-panel": "leafer-flow:toggle-export-panel",
  "auto-layout-panel": "leafer-flow:toggle-auto-layout-panel",
  "diagram-lint": "leafer-flow:toggle-diagram-lint",
} as const;

export type PanelToggleId = keyof typeof PANEL_TOGGLE_EVENT;

export function getPanelToggleEvent(id: PanelToggleId): string {
  return PANEL_TOGGLE_EVENT[id];
}

export function dispatchPanelToggle(id: PanelToggleId, detail?: unknown) {
  const eventName = PANEL_TOGGLE_EVENT[id];
  if (detail === undefined) {
    window.dispatchEvent(new CustomEvent(eventName));
    return;
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
