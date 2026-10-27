import type { Component } from "vue";

/** Dock ids for overlay panels contributed through OverlayPanelRegistry. */
export type OverlayPanelDockId = string;

export type OverlayPanelVisibilityMode = "open-prop" | "self-visible";

export interface OverlayPanelContribution {
  id: OverlayPanelDockId;
  label: string;
  icon?: string;
  pluginId?: string;
  component: Component;
  visibilityMode: OverlayPanelVisibilityMode;
  needsEditor?: boolean;
  order?: number;
  /** Extra props merged into the overlay component bindings. */
  props?: Record<string, unknown>;
}
