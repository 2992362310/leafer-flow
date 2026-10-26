import type { OverlayPanelContribution } from "../api/overlay-panel";

export class OverlayPanelRegistry {
  private contributions = new Map<string, OverlayPanelContribution>();

  register(panel: OverlayPanelContribution): OverlayPanelContribution {
    const existing = this.contributions.get(panel.id);
    if (existing) return existing;

    this.contributions.set(panel.id, panel);
    return panel;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((panel, id) => {
      if (panel.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  list(): OverlayPanelContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  getToggleEvents(): Partial<Record<OverlayPanelContribution["id"], string>> {
    return Object.fromEntries(
      this.list()
        .filter((panel) => panel.toggleEvent)
        .map((panel) => [panel.id, panel.toggleEvent!]),
    );
  }
}
