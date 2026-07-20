import type { Component } from "vue";

/** Dock ids for overlay panels contributed through OverlayPanelRegistry. */
export type OverlayPanelDockId =
  | "canvas-search"
  | "history-panel"
  | "plugin-market"
  | "shortcut-help"
  | "agent-chat"
  | "minimap-panel"
  | "multi-layer-panel"
  | "diagram-lint"
  | "drawing-settings"
  | "template-market"
  | "align-panel"
  | "layer-tools-panel"
  | "export-panel"
  | "auto-layout-panel";

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
  /** Extra props merged into the overlay component bindings. */
  props?: Record<string, unknown>;
}
