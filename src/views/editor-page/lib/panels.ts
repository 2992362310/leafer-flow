import type { DockPanelId } from "@/composables/usePanelDock";
import type { OverlayPanelDockId } from "@/editor/api/overlay-panel";
import { getPanelToggleEvent, PANEL_TOGGLE_EVENT } from "@/editor/api/panel-toggle";

/** Overlay panels rendered by Overlays.vue and managed through OverlayPanelRegistry. */
export type OverlayPanelId = OverlayPanelDockId;

/** Host-mounted panels on editor-page whose visibility is managed by page state. */
export type HostPanelId = "layer-panel";

/** All page-managed panel ids (host + overlay). */
export type PagePanelId = OverlayPanelId | HostPanelId;

export const OVERLAY_PANEL_IDS = [
  "agent-chat",
  "minimap-panel",
  "multi-layer-panel",
  "canvas-search",
  "history-panel",
  "diagram-lint",
  "plugin-market",
  "shortcut-help",
] as const satisfies readonly OverlayPanelId[];

export const HOST_PANEL_IDS = ["layer-panel"] as const satisfies readonly HostPanelId[];

export const PAGE_PANEL_IDS = [...HOST_PANEL_IDS, ...OVERLAY_PANEL_IDS] as const satisfies readonly PagePanelId[];

/**
 * Toggle events for host panels that are not registered in OverlayPanelRegistry.
 * Overlay panels contribute their own toggleEvent via the registry.
 */
export const HOST_PANEL_TOGGLE_EVENTS: Partial<Record<PagePanelId, string>> = {
  "layer-panel": getPanelToggleEvent("layer-panel"),
};

export { PANEL_TOGGLE_EVENT };

export function isPagePanelId(id: DockPanelId): id is PagePanelId {
  return (PAGE_PANEL_IDS as readonly string[]).includes(id);
}
