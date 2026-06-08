import type { ViewControlContribution } from "../api/view-control";

export class ViewControlRegistry {
  private contributions = new Map<string, ViewControlContribution>();

  register(control: ViewControlContribution): ViewControlContribution {
    const existing = this.contributions.get(control.id);
    if (existing) return existing;

    this.contributions.set(control.id, control);
    return control;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((control, id) => {
      if (control.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  list(): ViewControlContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  listByPlugin(pluginId: string): ViewControlContribution[] {
    return this.list().filter((control) => control.pluginId === pluginId);
  }
}
