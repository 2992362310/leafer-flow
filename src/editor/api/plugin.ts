import type { Component } from "vue";
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

export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "color";
  default?: unknown;
  placeholder?: string;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
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
  required?: boolean;
  configurable?: boolean;
}

export interface PluginContributionPreview {
  tools?: string[];
  commands?: string[];
  menus?: string[];
  buttons?: string[];
  viewControls?: string[];
  propertyPanels?: string[];
}

export interface EditorPluginModule {
  manifest: EditorPluginManifest;
  contributes?: PluginContributionPreview;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
  configure?(ctx: PluginContext): PluginConfigSchema | Component;
}
