import type Editor from "../../editor";
import type { EditorPluginManifest } from "../../api/plugin";
import {
  getBuiltinPluginById,
  getEnabledPluginIds,
  listPluginMarketItems,
  saveEnabledPluginIds,
} from "./builtin-registry";

export interface PluginMarketContributionSummary {
  tools: number;
  commands: number;
  toolLabels: string[];
  commandLabels: string[];
}

export interface PluginMarketViewItem {
  manifest: EditorPluginManifest;
  builtin: boolean;
  enabled: boolean;
  active: boolean;
  contributions: PluginMarketContributionSummary;
}

export function listInstalledPlugins(editor?: Editor): PluginMarketViewItem[] {
  return listPluginMarketItems().map((item) => ({
    ...item,
    active: editor?.pluginManager.isActive(item.manifest.id) ?? item.enabled,
    contributions: getPluginContributionSummary(editor, item.manifest.id),
  }));
}

export async function enablePlugin(editor: Editor, pluginId: string): Promise<boolean> {
  const plugin = getBuiltinPluginById(pluginId);
  if (!plugin) return false;

  await editor.pluginManager.activate(plugin);
  saveEnabledPluginIds([...getEnabledPluginIds(), pluginId]);
  return true;
}

export async function disablePlugin(editor: Editor, pluginId: string): Promise<boolean> {
  if (!editor.pluginManager.isActive(pluginId)) {
    saveEnabledPluginIds(getEnabledPluginIds().filter((id) => id !== pluginId));
    return true;
  }

  await editor.pluginManager.deactivate(pluginId);
  saveEnabledPluginIds(getEnabledPluginIds().filter((id) => id !== pluginId));
  return true;
}

function getPluginContributionSummary(editor: Editor | undefined, pluginId: string) {
  if (!editor) {
    return { tools: 0, commands: 0, toolLabels: [], commandLabels: [] };
  }

  const activeTools = editor.toolRegistry.listByPlugin(pluginId);
  const activeCommands = editor.commands.listByPlugin(pluginId);
  const plugin = getBuiltinPluginById(pluginId);
  const toolLabels = activeTools.length
    ? activeTools.map((tool) => tool.label)
    : (plugin?.contributes?.tools ?? []);
  const commandLabels = activeCommands.length
    ? activeCommands.map((command) => command.label)
    : (plugin?.contributes?.commands ?? []);

  return {
    tools: toolLabels.length,
    commands: commandLabels.length,
    toolLabels,
    commandLabels,
  };
}
