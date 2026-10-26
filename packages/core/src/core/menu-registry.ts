import type { MenuContribution, MenuGroupContribution } from "../api/menu";
import type Editor from "../editor";

export class MenuRegistry {
  private editor: Editor;
  private contributions = new Map<string, MenuContribution>();

  constructor(editor: Editor) {
    this.editor = editor;
  }

  register(menu: MenuContribution): MenuContribution {
    const existing = this.contributions.get(menu.id);
    if (existing) return existing;

    this.contributions.set(menu.id, menu);
    return menu;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((menu, id) => {
      if (menu.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  list(): MenuContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  listByPlugin(pluginId: string): MenuContribution[] {
    return this.list().filter((menu) => menu.pluginId === pluginId);
  }

  getContextMenuGroups(): MenuGroupContribution[] {
    const groups = new Map<string, MenuContribution[]>();

    this.list()
      .filter((menu) => !menu.when || menu.when(this.editor))
      .forEach((menu) => {
        const groupId = menu.group ?? "default";
        const items = groups.get(groupId) ?? [];
        items.push(menu);
        groups.set(groupId, items);
      });

    return [...groups.entries()].map(([id, items]) => ({ id, items }));
  }
}
