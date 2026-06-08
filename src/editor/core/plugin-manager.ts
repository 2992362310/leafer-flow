import type Editor from "../editor";
import type { EditorPluginModule, PluginContext, PluginLogger, PluginStorage } from "../api/plugin";

class LocalPluginStorage implements PluginStorage {
  private namespace: string;

  constructor(pluginId: string) {
    this.namespace = `leafer-flow.plugin.${pluginId}.`;
  }

  get<T = unknown>(key: string): T | null {
    const raw = localStorage.getItem(this.namespace + key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  set<T = unknown>(key: string, value: T): void {
    localStorage.setItem(this.namespace + key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(this.namespace + key);
  }
}

function createPluginLogger(pluginId: string): PluginLogger {
  return {
    info: (message) => console.info(`[plugin:${pluginId}] ${message}`),
    warn: (message) => console.warn(`[plugin:${pluginId}] ${message}`),
    error: (message, error) => console.error(`[plugin:${pluginId}] ${message}`, error),
  };
}

export class PluginManager {
  private editor: Editor;
  private activePlugins = new Map<string, EditorPluginModule>();

  constructor(editor: Editor) {
    this.editor = editor;
  }

  async activate(plugin: EditorPluginModule): Promise<void> {
    const { id } = plugin.manifest;
    if (this.activePlugins.has(id)) return;

    const ctx: PluginContext = {
      pluginId: id,
      editor: this.editor,
      logger: createPluginLogger(id),
      storage: new LocalPluginStorage(id),
    };

    await plugin.activate(ctx);
    this.activePlugins.set(id, plugin);
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.activePlugins.get(pluginId);
    if (!plugin) return;

    const ctx: PluginContext = {
      pluginId,
      editor: this.editor,
      logger: createPluginLogger(pluginId),
      storage: new LocalPluginStorage(pluginId),
    };

    await plugin.deactivate?.(ctx);
    this.editor.unregisterToolsByPlugin(pluginId);
    this.editor.commands.unregisterByPlugin(pluginId);
    this.activePlugins.delete(pluginId);
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  listActive() {
    return [...this.activePlugins.values()].map((plugin) => plugin.manifest);
  }
}
