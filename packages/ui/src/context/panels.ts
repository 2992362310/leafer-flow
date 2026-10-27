import type { OverlayPanelDockId } from "@leafer-flow/core/api/overlay-panel";

/** Overlay panels rendered by Overlays.vue and managed through OverlayPanelRegistry. */
export type OverlayPanelId = OverlayPanelDockId;

/** Host-mounted panels on editor-page whose visibility is managed by page state. */
export type HostPanelId = "layer-panel";

/** All page-managed panel ids (host + overlay). */
export type PagePanelId = OverlayPanelId | HostPanelId;

export const HOST_PANEL_IDS = ["layer-panel"] as const satisfies readonly HostPanelId[];
