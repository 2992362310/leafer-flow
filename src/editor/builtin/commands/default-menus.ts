import { ACTION_NAME } from "../../constants";
import type Editor from "../../editor";
import type { MenuContribution } from "../../api/menu";

export const BUILTIN_MENUS_PLUGIN_ID = "leafer-flow.builtin-menus";

const DEFAULT_CONTEXT_MENUS: MenuContribution[] = [
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
    id: "context.connectors-to-front",
    label: "连接线置顶",
    command: ACTION_NAME.CONNECTORS_TO_FRONT,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "layer",
    order: 50,
  },
  {
    id: "context.delete",
    label: "删除",
    command: ACTION_NAME.DELETE,
    pluginId: BUILTIN_MENUS_PLUGIN_ID,
    group: "danger",
    order: 60,
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
  return Boolean(list && list.some((el) => "children" in el && (el as { children?: unknown }).children));
}
