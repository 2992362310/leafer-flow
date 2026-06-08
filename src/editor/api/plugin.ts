import type Editor from "../editor";

export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export interface PluginStorage {
  get<T = unknown>(key: string): T | null;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
}

export interface PluginContext {
  pluginId: string;
  editor: Editor;
  logger: PluginLogger;
  storage: PluginStorage;
}

export interface EditorPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  category?: "tool" | "shape" | "panel" | "export" | "layout" | "utility" | string;
  capabilities?: string[];
  enabledByDefault?: boolean;
}

export interface PluginContributionPreview {
  tools?: string[];
  commands?: string[];
  menus?: string[];
  buttons?: string[];
}

export interface EditorPluginModule {
  manifest: EditorPluginManifest;
  contributes?: PluginContributionPreview;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
}
