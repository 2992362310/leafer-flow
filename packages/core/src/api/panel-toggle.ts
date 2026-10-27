import type Editor from "../editor";

export type PanelToggleId = string;

export interface PanelRequest {
  id: PanelToggleId;
  action: "open" | "close" | "toggle";
  detail?: unknown;
}

export function dispatchPanelToggle(editor: Editor, id: PanelToggleId, detail?: unknown) {
  editor.overlayPanels.request(id, "toggle", detail);
}
