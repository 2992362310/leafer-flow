import type { Component } from "vue";

/** Dock ids for overlay panels contributed through OverlayPanelRegistry. */
export type OverlayPanelDockId =
  | "canvas-search"
  | "history-panel"
  | "plugin-market"
  | "agent-chat"
  | "minimap-panel"
  | "multi-layer-panel"
  | "diagram-lint";

export type OverlayPanelVisibilityMode = "open-prop" | "self-visible";

export interface OverlayPanelContribution {
  id: OverlayPanelDockId;
  pluginId?: string;
  component: Component;
  visibilityMode: OverlayPanelVisibilityMode;
  needsEditor?: boolean;
  order?: number;
  /** Window event name used by the Vue page layer to toggle float visibility. */
  toggleEvent?: string;
}
