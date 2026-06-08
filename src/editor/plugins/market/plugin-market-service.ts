import type Editor from "../../editor";
import type { EditorPluginManifest } from "../../api/plugin";
import {
  getBuiltinPluginById,
  getEnabledPluginIds,
  listPluginMarketItems,
  saveEnabledPluginIds,
} from "./builtin-registry";

export type PluginContributionKind =
  | "tool"
  | "command"
  | "menu"
  | "action-button"
  | "view-control"
  | "property-panel";

export interface PluginContributionGroupSummary {
  kind: PluginContributionKind;
  label: string;
  count: number;
  items: string[];
}

export interface PluginMarketContributionSummary {
  total: number;
  groups: PluginContributionGroupSummary[];
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
      total: 0,
      groups: [],
    };
  }

  const activeTools = editor.toolRegistry.listByPlugin(pluginId);
  const activeCommands = editor.commands.listByPlugin(pluginId);
  const activeMenus = editor.menus.listByPlugin(pluginId);
  const activeButtons = editor.actionButtons.listByPlugin(pluginId);
  const activeViewControls = editor.viewControls.listByPlugin(pluginId);
  const activePropertyPanels = editor.propertyPanels.listByPlugin(pluginId);
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
    ? activeButtons.flatMap((group) => [
        ...group.items.map((item) => item.label),
        ...(group.panelItems?.map((item) => item.label) ?? []),
      ])
    : (plugin?.contributes?.buttons ?? []);

  const viewControlLabels = activeViewControls.length
    ? activeViewControls.map((control) => control.label)
    : (plugin?.contributes?.viewControls ?? []);

  const propertyPanelLabels = activePropertyPanels.length
    ? activePropertyPanels.map((panel) => panel.title)
    : (plugin?.contributes?.propertyPanels ?? []);

  const groups = [
    createContributionGroup("tool", "工具贡献", toolLabels),
    createContributionGroup("command", "命令贡献", commandLabels),
    createContributionGroup("menu", "菜单贡献", menuLabels),
    createContributionGroup("action-button", "按钮贡献", buttonLabels),
    createContributionGroup("view-control", "视图控件贡献", viewControlLabels),
    createContributionGroup("property-panel", "属性面板贡献", propertyPanelLabels),
  ].filter((group) => group.count > 0);

  return {
    total: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
  };
}

function createContributionGroup(
  kind: PluginContributionKind,
  label: string,
  items: string[],
): PluginContributionGroupSummary {
  return {
    kind,
    label,
    count: items.length,
    items,
  };
}
