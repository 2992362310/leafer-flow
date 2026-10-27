import type { OverlayPanelContribution } from "../api/overlay-panel";
import type { PanelRequest } from "../api/panel-toggle";

export class OverlayPanelRegistry {
  private contributions = new Map<string, OverlayPanelContribution>();
  private listeners = new Set<() => void>();
  private requestListeners = new Set<(request: PanelRequest) => void>();

  register(panel: OverlayPanelContribution): () => void {
    if (!panel.id.trim()) throw new Error("Panel id must not be empty");
    if (this.contributions.has(panel.id)) throw new Error(`Panel already registered: ${panel.id}`);
    this.contributions.set(panel.id, panel);
    this.notify();
    return () => {
      if (this.contributions.get(panel.id) === panel) this.unregister(panel.id);
    };
  }

  unregister(id: string): void {
    if (this.contributions.delete(id)) this.notify();
  }

  unregisterByPlugin(pluginId: string): void {
    let changed = false;
    this.contributions.forEach((panel, id) => {
      if (panel.pluginId === pluginId) {
        this.contributions.delete(id);
        changed = true;
      }
    });
    if (changed) this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  list(): OverlayPanelContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  subscribeRequests(listener: (request: PanelRequest) => void): () => void {
    this.requestListeners.add(listener);
    return () => { this.requestListeners.delete(listener); };
  }

  request(id: string, action: PanelRequest["action"] = "toggle", detail?: unknown) {
    for (const listener of this.requestListeners) listener({ id, action, detail });
  }
}
