import type {
  PropertyFieldPanelContribution,
  PropertyPanelContext,
  PropertyPanelContribution,
} from "../api/property-panel";
import SchemaPropertyPanel from "@/components/EditorPanel/SchemaPropertyPanel.vue";

export class PropertyPanelRegistry {
  private contributions = new Map<string, PropertyPanelContribution>();

  register(panel: PropertyPanelContribution): PropertyPanelContribution {
    const existing = this.contributions.get(panel.id);
    if (existing) return existing;

    this.contributions.set(panel.id, panel);
    return panel;
  }

  registerFields(panel: PropertyFieldPanelContribution): PropertyPanelContribution {
    return this.register({
      id: panel.id,
      title: panel.title,
      pluginId: panel.pluginId,
      order: panel.order,
      component: SchemaPropertyPanel,
      match: panel.match,
      fields: panel.fields,
    } as PropertyPanelContribution & { fields: PropertyFieldPanelContribution["fields"] });
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

  list(): PropertyPanelContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  listMatched(context: PropertyPanelContext): PropertyPanelContribution[] {
    return this.list().filter((panel) => panel.match(context));
  }

  listByPlugin(pluginId: string): PropertyPanelContribution[] {
    return this.list().filter((panel) => panel.pluginId === pluginId);
  }
}
