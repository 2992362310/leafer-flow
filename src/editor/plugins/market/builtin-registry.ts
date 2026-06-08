import type { EditorPluginManifest } from "../../api/plugin";
import { builtinPlugins } from "../../builtin/plugins";

const ENABLED_PLUGINS_KEY = "leafer-flow.enabled-plugins";

export interface PluginMarketItem {
  manifest: EditorPluginManifest;
  builtin: boolean;
  enabled: boolean;
}

export function getEnabledPluginIds() {
  try {
    const raw = localStorage.getItem(ENABLED_PLUGINS_KEY);
    if (!raw) {
      return builtinPlugins
        .filter((plugin) => plugin.manifest.enabledByDefault)
        .map((plugin) => plugin.manifest.id);
    }

    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is string => typeof id === "string");
  } catch (error) {
    console.warn("读取插件启用状态失败", error);
    return builtinPlugins
      .filter((plugin) => plugin.manifest.enabledByDefault)
      .map((plugin) => plugin.manifest.id);
  }
}

export function saveEnabledPluginIds(ids: string[]) {
  localStorage.setItem(ENABLED_PLUGINS_KEY, JSON.stringify([...new Set(ids)]));
}

export function listPluginMarketItems(): PluginMarketItem[] {
  const enabledIds = new Set(getEnabledPluginIds());
  return builtinPlugins.map((plugin) => ({
    manifest: plugin.manifest,
    builtin: true,
    enabled: enabledIds.has(plugin.manifest.id),
  }));
}

export function getBuiltinPluginById(pluginId: string) {
  return builtinPlugins.find((plugin) => plugin.manifest.id === pluginId);
}
