import type Editor from "../editor";
import type { ShapeLibraryGroup, ShapeLibraryItem } from "../tool-definitions";
import type { IEditorTool } from "../types";
import type {
  RegisteredToolContribution,
  ToolContribution,
  ToolToolbarGroup,
  ToolToolbarItem,
} from "../api/tool";

export class ToolRegistry {
  private editor: Editor;
  private contributions = new Map<string, RegisteredToolContribution>();
  private libraryGroupTitles = new Map<string, string>([
    ["basic", "基础图形"],
    ["flow", "流程图"],
    ["bpmn", "BPMN"],
    ["architecture", "架构图"],
  ]);
  private toolbarGroupTitles = new Map<string, string>([
    ["core", "核心工具"],
    ["shapes", "基础图形"],
    ["flow", "流程图"],
    ["bpmn", "BPMN"],
    ["architecture", "架构图"],
  ]);

  constructor(editor: Editor) {
    this.editor = editor;
  }

  register(contribution: ToolContribution): RegisteredToolContribution {
    const existing = this.contributions.get(contribution.id);
    if (existing) return existing;

    const tool = contribution.createTool();
    tool.init(this.editor);

    const registered: RegisteredToolContribution = {
      ...contribution,
      tool,
    };

    this.contributions.set(contribution.id, registered);
    return registered;
  }

  registerLegacy(id: string, tool: IEditorTool): IEditorTool {
    tool.init(this.editor);
    this.contributions.set(id, {
      id,
      label: id,
      createTool: () => tool,
      tool,
    });
    return tool;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((contribution, id) => {
      if (contribution.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  get(id: string): IEditorTool | undefined {
    return this.contributions.get(id)?.tool;
  }

  getContribution(id: string): RegisteredToolContribution | undefined {
    return this.contributions.get(id);
  }

  has(id: string): boolean {
    return this.contributions.has(id);
  }

  list(): RegisteredToolContribution[] {
    return [...this.contributions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  listByPlugin(pluginId: string): RegisteredToolContribution[] {
    return this.list().filter((contribution) => contribution.pluginId === pluginId);
  }

  listLibraryTools() {
    return this.list().filter((contribution) => contribution.library);
  }

  getShapeLibraryGroups(): ShapeLibraryGroup[] {
    const groups = new Map<string, ShapeLibraryItem[]>();

    this.listLibraryTools().forEach((contribution) => {
      const { library } = contribution;
      if (!library) return;

      const items = groups.get(library.groupId) ?? [];
      items.push({
        tool: contribution.id,
        icon: library.icon,
        label: contribution.label,
        keywords: library.keywords ?? [],
        width: library.width,
        height: library.height,
      });
      groups.set(library.groupId, items);
    });

    return [...groups.entries()].map(([id, items]) => ({
      id,
      title: this.libraryGroupTitles.get(id) ?? id,
      items,
    }));
  }

  listToolbarTools() {
    return this.list().filter((contribution) => contribution.toolbar);
  }

  getToolbarGroups(): ToolToolbarGroup[] {
    const groups = new Map<string, ToolToolbarItem[]>();

    this.listToolbarTools().forEach((contribution) => {
      const { toolbar } = contribution;
      if (!toolbar) return;

      const items = groups.get(toolbar.groupId) ?? [];
      items.push({
        tool: contribution.id,
        icon: toolbar.icon,
        tip: toolbar.tip ?? contribution.label,
        shortcut: toolbar.shortcut,
        order: toolbar.order,
      });
      groups.set(toolbar.groupId, items);
    });

    return [...groups.entries()].map(([id, items]) => ({
      id,
      title: this.toolbarGroupTitles.get(id) ?? id,
      items: items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));
  }
}
