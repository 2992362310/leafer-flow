import { ACTION_NAME } from "../../constants";
import type Editor from "../../editor";
import type { MenuContribution } from "../../api/menu";
import { Connector } from "../../core/connector";

export const BUILTIN_MENUS_PLUGIN_ID = "leafer-flow.builtin-core";

const DEFAULT_CONTEXT_MENUS: MenuContribution[] = [
  {
    id: "context.cut",
    label: "剪切",
    command: ACTION_NAME.CUT,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "clipboard",
    order: 5,
    shortcut: "Ctrl+X",
    when: hasSelection,
  },
  {
    id: "context.copy",
    label: "复制",
    command: ACTION_NAME.COPY,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "clipboard",
    order: 10,
    shortcut: "Ctrl+C",
    when: hasSelection,
  },
  {
    id: "context.paste",
    label: "粘贴",
    command: ACTION_NAME.PASTE,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "clipboard",
    order: 20,
    shortcut: "Ctrl+V",
  },
  {
    id: "context.duplicate",
    label: "原位复制",
    command: ACTION_NAME.DUPLICATE,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "clipboard",
    order: 25,
    shortcut: "Ctrl+D",
    when: hasSelection,
  },
  {
    id: "context.group",
    label: "编组",
    command: ACTION_NAME.GROUP,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "group",
    order: 30,
    shortcut: "Ctrl+G",
    when: hasSelection,
  },
  {
    id: "context.ungroup",
    label: "取消编组",
    command: ACTION_NAME.UNGROUP,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "group",
    order: 40,
    shortcut: "Ctrl+Shift+G",
    when: hasGroup,
  },
  {
    id: "context.bring-forward",
    label: "上移一层",
    command: ACTION_NAME.BRING_FORWARD,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 50,
    shortcut: "Ctrl+]",
    when: hasSelection,
  },
  {
    id: "context.send-backward",
    label: "下移一层",
    command: ACTION_NAME.SEND_BACKWARD,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 55,
    shortcut: "Ctrl+[",
    when: hasSelection,
  },
  {
    id: "context.connectors-to-front",
    label: "连接线置顶",
    command: ACTION_NAME.CONNECTORS_TO_FRONT,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 60,
  },
  {
    id: "context.lock",
    label: "锁定/解锁",
    command: ACTION_NAME.LOCK_SELECTED,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 65,
    shortcut: "Ctrl+Shift+L",
    when: hasSelection,
  },
  {
    id: "context.unlock-all",
    label: "解锁所有元素",
    command: ACTION_NAME.UNLOCK_ALL,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 67,
  },
  {
    id: "context.add-waypoint",
    label: "添加连接线中间点",
    command: ACTION_NAME.ADD_CONNECTOR_WAYPOINT,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "connector",
    order: 68,
    when: hasSelectedConnector,
  },
  {
    id: "context.remove-waypoints",
    label: "移除连接线中间点",
    command: ACTION_NAME.REMOVE_CONNECTOR_WAYPOINTS,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "connector",
    order: 69,
    when: hasSelectedConnector,
  },
  {
    id: "context.delete",
    label: "删除",
    command: ACTION_NAME.DELETE,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "danger",
    order: 70,
    shortcut: "Del",
    danger: true,
    when: hasSelection,
  },
];

export function registerDefaultMenus(editor: Editor) {
  DEFAULT_CONTEXT_MENUS.forEach((menu) => editor.menus.register(menu));
}

function hasSelection(editor: Editor) {
  const list = editor.app.editor.list;
  return Boolean(list && list.length > 0);
}

function hasGroup(editor: Editor) {
  const list = editor.app.editor.list;
  return Boolean(
    list && list.some((el) => "children" in el && (el as { children?: unknown }).children),
  );
}

function hasSelectedConnector(editor: Editor) {
  const list = editor.app.editor.list;
  return Boolean(list && list.some((el) => el instanceof Connector));
}
