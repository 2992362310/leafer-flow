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
  private activePlugins = new Map<string, {
    plugin: EditorPluginModule;
    context: PluginContext;
    cleanups: Array<() => void | Promise<void>>;
    disposing: boolean;
  }>();
  private pending = new Map<string, Promise<void>>();
  private disposed = false;
  private disposePromise?: Promise<void>;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  activate(plugin: EditorPluginModule): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("Plugin manager is disposed"));
    const { id } = plugin.manifest;
    return this.enqueue(id, async () => {
      if (this.activePlugins.has(id)) return;
      const cleanups: Array<() => void | Promise<void>> = [];
      const record = {
        plugin,
        cleanups,
        disposing: false,
        context: {
          pluginId: id,
          editor: this.editor,
          logger: createPluginLogger(id),
          storage: new LocalPluginStorage(id),
          onDispose(cleanup: () => void | Promise<void>) {
            if (record.disposing) throw new Error("Plugin is disposing");
            cleanups.push(cleanup);
          },
        },
      };
      try {
        await plugin.activate(record.context);
        this.activePlugins.set(id, record);
      } catch (error) {
        try {
          await this.release(record);
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], `Plugin activation failed: ${id}`);
        }
        throw error;
      }
    });
  }

  deactivate(pluginId: string): Promise<void> {
    return this.enqueue(pluginId, async () => {
      const record = this.activePlugins.get(pluginId);
      if (!record) return;
      try {
        await this.release(record);
      } finally {
        this.activePlugins.delete(pluginId);
      }
    });
  }

  destroy(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    this.disposed = true;
    this.disposePromise = (async () => {
      await Promise.allSettled([...this.pending.values()]);
      const errors: unknown[] = [];
      for (const id of [...this.activePlugins.keys()].reverse()) {
        try {
          await this.deactivate(id);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw new AggregateError(errors, "Plugin disposal failed");
    })();
    return this.disposePromise;
  }

  private enqueue(id: string, operation: () => Promise<void>): Promise<void> {
    const task = (this.pending.get(id) ?? Promise.resolve())
      .catch(() => undefined)
      .then(operation)
      .finally(() => {
        if (this.pending.get(id) === task) this.pending.delete(id);
      });
    this.pending.set(id, task);
    return task;
  }

  private async release(record: NonNullable<ReturnType<typeof this.activePlugins.get>>) {
    record.disposing = true;
    const id = record.plugin.manifest.id;
    const errors: unknown[] = [];
    const cleanupSteps = [
      () => record.plugin.deactivate?.(record.context),
      ...record.cleanups.splice(0).reverse(),
      () => this.editor.unregisterToolsByPlugin(id),
      ...[
        this.editor.commands, this.editor.menus, this.editor.actionButtons,
        this.editor.viewControls, this.editor.propertyPanels, this.editor.overlayPanels, this.editor.nodeTypes,
      ].map((registry) => () => registry.unregisterByPlugin(id)),
    ];
    for (const cleanup of cleanupSteps) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, `Plugin cleanup failed: ${id}`);
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  listActive() {
    return [...this.activePlugins.values()].map(({ plugin }) => plugin.manifest);
  }
}
