import type { ActionButtonGroupContribution } from "../api/action-button";

export class ActionButtonRegistry {
  private contributions = new Map<string, ActionButtonGroupContribution>();

  register(group: ActionButtonGroupContribution): ActionButtonGroupContribution {
    const existing = this.contributions.get(group.id);
    if (existing) return existing;

    this.contributions.set(group.id, group);
    return group;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((group, id) => {
      if (group.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  list(): ActionButtonGroupContribution[] {
    return [...this.contributions.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        panelItems: group.panelItems
          ? [...group.panelItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          : undefined,
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  listByPlugin(pluginId: string): ActionButtonGroupContribution[] {
    return this.list().filter((group) => group.pluginId === pluginId);
  }
}
