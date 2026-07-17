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
