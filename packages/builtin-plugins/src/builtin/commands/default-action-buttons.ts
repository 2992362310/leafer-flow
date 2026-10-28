import { ACTION_NAME, BUILTIN_PLUGIN_ID } from "@leafer-flow/core/constants";
import type { ActionButtonGroupContribution } from "@leafer-flow/core/api/action-button";
import type Editor from "@leafer-flow/core/editor";

const DEFAULT_ACTION_BUTTON_GROUPS: ActionButtonGroupContribution[] = [
  {
    id: "history",
    label: "历史",
    icon: "undo",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "edit",
    order: 10,
    items: [
      { id: "undo", label: "撤销 (Ctrl+Z)", command: ACTION_NAME.UNDO, icon: "undo", order: 10 },
      {
        id: "redo",
        label: "重做 (Ctrl+Shift+Z)",
        command: ACTION_NAME.REDO,
        icon: "redo",
        order: 20,
      },
    ],
  },
  {
    id: "connector-label",
    label: "连接线标签",
    icon: "connector_label",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "edit",
    order: 20,
    items: [
      {
        id: "add-connector-label",
        command: ACTION_NAME.ADD_CONNECTOR_LABEL,
        icon: "connector_label",
        label: "添加连线标签（请先选中连线）",
      },
    ],
  },
  {
    id: "media",
    label: "媒体",
    icon: "insert_image",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "edit",
    order: 30,
    items: [
      {
        id: "insert-image",
        label: "插入图片",
        command: ACTION_NAME.INSERT_IMAGE,
        icon: "insert_image",
      },
      {
        id: "import-svg",
        label: "导入 SVG",
        command: ACTION_NAME.IMPORT_SVG,
        icon: "insert_image",
      },
      {
        id: "insert-video",
        label: "插入视频",
        command: ACTION_NAME.INSERT_VIDEO,
        icon: "insert_image",
      },
    ],
  },
  {
    id: "danger",
    label: "危险操作",
    icon: "clear",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "edit",
    order: 40,
    items: [
      {
        id: "clear-canvas",
        label: "清空画布",
        command: ACTION_NAME.CLEAR_CANVAS,
        icon: "clear",
        danger: true,
      },
    ],
  },
  {
    id: "align",
    label: "对齐与分布",
    icon: "align_center",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "arrange",
    order: 10,
    items: [
      {
        id: "toggle-align-panel",
        label: "对齐与分布",
        command: "toggleAlignPanel",
        icon: "align_center",
        panelId: "align-panel",
      },
    ],
  },
  {
    id: "connector-panel",
    label: "连线中心",
    icon: "draw_arrow",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "arrange",
    order: 15,
    items: [
      {
        id: "toggle-connector-panel",
        label: "连线中心",
        command: "toggleConnectorPanel",
        icon: "draw_arrow",
        panelId: "connector-panel",
      },
    ],
  },
  {
    id: "layer",
    label: "图层与状态",
    icon: "layer",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "arrange",
    order: 20,
    items: [
      {
        id: "toggle-layer-tools-panel",
        label: "图层与状态",
        command: "toggleLayerToolsPanel",
        icon: "layer",
        panelId: "layer-tools-panel",
      },
    ],
  },
  {
    id: "panels",
    label: "面板",
    icon: "settings",
    pluginId: BUILTIN_PLUGIN_ID,
    kind: "button",
    surface: "panel",
    order: 10,
    items: [
      {
        id: "history-panel",
        label: "历史面板",
        command: "toggleHistoryPanel",
        icon: "undo",
        panelId: "history-panel",
        order: 10,
      },
      {
        id: "layer-panel",
        label: "图层树",
        command: "toggleLayerPanel",
        icon: "layer",
        panelId: "layer-panel",
        order: 20,
      },
      {
        id: "canvas-search",
        label: "搜索",
        command: ACTION_NAME.FIND,
        icon: "select",
        panelId: "canvas-search",
        order: 30,
      },
      {
        id: "shortcut-help",
        label: "快捷键帮助",
        command: "toggleShortcutHelp",
        icon: "info",
        panelId: "shortcut-help",
        order: 40,
      },
    ],
  },
];

export function registerDefaultActionButtons(editor: Editor) {
  DEFAULT_ACTION_BUTTON_GROUPS.forEach((group) => editor.actionButtons.register(group));
}
