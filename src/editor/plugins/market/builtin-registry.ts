import type { EditorPluginManifest } from "../../api/plugin";
import { builtinPlugins } from "../../builtin/plugins";
import { listPurchasedPluginIds } from "./entitlements";

const ENABLED_PLUGINS_KEY = "leafer-flow.enabled-plugins";
const DEFAULT_PLUGIN_MIGRATIONS_KEY = "leafer-flow.enabled-plugins.default-migrations";
const DEFAULT_PLUGIN_MIGRATIONS = [
  "leafer-flow.drawing-settings",
  "leafer-flow.view-controls",
  "leafer-flow.file-actions",
  "leafer-flow.export-actions",
  "leafer-flow.template-actions",
  "leafer-flow.agent",
];

export interface PluginMarketItem {
  manifest: EditorPluginManifest;
  builtin: boolean;
  enabled: boolean;
}

export function getEnabledPluginIds() {
  try {
    const requiredIds = getRequiredPluginIds();
    const raw = localStorage.getItem(ENABLED_PLUGINS_KEY);
    if (!raw) {
      return [...requiredIds, ...getDefaultEnabledPluginIds()];
    }

    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return [...requiredIds];

    const enabledIds = ids.filter((id): id is string => typeof id === "string");
    return [...new Set([...requiredIds, ...migrateDefaultEnabledPluginIds(enabledIds)])];
  } catch (error) {
    console.warn("读取插件启用状态失败", error);
    return [...getRequiredPluginIds(), ...getDefaultEnabledPluginIds()];
  }
}

function getRequiredPluginIds() {
  return builtinPlugins
    .filter((plugin) => plugin.manifest.required)
    .map((plugin) => plugin.manifest.id);
}

function getDefaultEnabledPluginIds() {
  const purchasedIds = new Set(listPurchasedPluginIds());
  return builtinPlugins
    .filter(
      (plugin) =>
        (plugin.manifest.enabledByDefault || purchasedIds.has(plugin.manifest.id)) &&
        !plugin.manifest.required,
    )
    .map((plugin) => plugin.manifest.id);
}

function getMigratedDefaultPluginIds() {
  try {
    const raw = localStorage.getItem(DEFAULT_PLUGIN_MIGRATIONS_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch (error) {
    console.warn("读取默认插件迁移状态失败", error);
    return [];
  }
}

function saveMigratedDefaultPluginIds(ids: string[]) {
  localStorage.setItem(DEFAULT_PLUGIN_MIGRATIONS_KEY, JSON.stringify([...new Set(ids)]));
}

function migrateDefaultEnabledPluginIds(enabledIds: string[]) {
  const migratedIds = getMigratedDefaultPluginIds();
  const pendingMigrations = DEFAULT_PLUGIN_MIGRATIONS.filter((id) => !migratedIds.includes(id));
  if (!pendingMigrations.length) return enabledIds;

  const nextIds = [...new Set([...enabledIds, ...pendingMigrations])];
  saveMigratedDefaultPluginIds([...migratedIds, ...pendingMigrations]);
  localStorage.setItem(ENABLED_PLUGINS_KEY, JSON.stringify(nextIds));
  return nextIds;
}

export function saveEnabledPluginIds(ids: string[]) {
  localStorage.setItem(
    ENABLED_PLUGINS_KEY,
    JSON.stringify([...new Set([...getRequiredPluginIds(), ...ids])]),
  );
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
