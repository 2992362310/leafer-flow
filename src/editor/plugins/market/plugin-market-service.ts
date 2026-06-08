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
  menus: number;
  buttons: number;
  toolLabels: string[];
  commandLabels: string[];
  menuLabels: string[];
  buttonLabels: string[];
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
  const plugin = getBuiltinPluginById(pluginId);
  if (plugin?.manifest.required) return false;

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
    return {
      tools: 0,
      commands: 0,
      menus: 0,
      buttons: 0,
      toolLabels: [],
      commandLabels: [],
      menuLabels: [],
      buttonLabels: [],
    };
  }

  const activeTools = editor.toolRegistry.listByPlugin(pluginId);
  const activeCommands = editor.commands.listByPlugin(pluginId);
  const activeMenus = editor.menus.listByPlugin(pluginId);
  const activeButtons = editor.actionButtons.listByPlugin(pluginId);
  const plugin = getBuiltinPluginById(pluginId);
  const toolLabels = activeTools.length
    ? activeTools.map((tool) => tool.label)
    : (plugin?.contributes?.tools ?? []);
  const commandLabels = activeCommands.length
    ? activeCommands.map((command) => command.label)
    : (plugin?.contributes?.commands ?? []);
  const menuLabels = activeMenus.length
    ? activeMenus.map((menu) => menu.label)
    : (plugin?.contributes?.menus ?? []);
  const buttonLabels = activeButtons.length
    ? activeButtons.flatMap((group) => group.items.map((item) => item.label))
    : (plugin?.contributes?.buttons ?? []);

  return {
    tools: toolLabels.length,
    commands: commandLabels.length,
    menus: menuLabels.length,
    buttons: buttonLabels.length,
    toolLabels,
    commandLabels,
    menuLabels,
    buttonLabels,
  };
}
