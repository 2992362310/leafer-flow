import { ACTION_NAME } from "../../constants";
import type { ActionButtonGroupContribution } from "../../api/action-button";
import type Editor from "../../editor";

export const BUILTIN_ACTION_BUTTONS_PLUGIN_ID = "leafer-flow.builtin-core";

const DEFAULT_ACTION_BUTTON_GROUPS: ActionButtonGroupContribution[] = [
  {
    id: "history",
    label: "历史",
    icon: "undo",
    pluginId: BUILTIN_ACTION_BUTTONS_PLUGIN_ID,
    kind: "button",
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
    id: "align",
    label: "对齐与分布",
    icon: "align_center",
    pluginId: BUILTIN_ACTION_BUTTONS_PLUGIN_ID,
    kind: "dropdown",
    order: 20,
    items: [
      { id: "align-left", command: ACTION_NAME.ALIGN_LEFT, icon: "align_left", label: "左对齐" },
      {
        id: "align-center",
        command: ACTION_NAME.ALIGN_CENTER,
        icon: "align_center",
        label: "水平居中",
      },
      { id: "align-right", command: ACTION_NAME.ALIGN_RIGHT, icon: "align_right", label: "右对齐" },
      { id: "align-top", command: ACTION_NAME.ALIGN_TOP, icon: "align_top", label: "顶部对齐" },
      {
        id: "align-middle",
        command: ACTION_NAME.ALIGN_MIDDLE,
        icon: "align_middle",
        label: "垂直居中",
      },
      {
        id: "align-bottom",
        command: ACTION_NAME.ALIGN_BOTTOM,
        icon: "align_bottom",
        label: "底部对齐",
      },
      {
        id: "distribute-horizontal",
        command: ACTION_NAME.DISTRIBUTE_HORIZONTAL,
        icon: "distribute_horizontal",
        label: "水平分布",
      },
      {
        id: "distribute-vertical",
        command: ACTION_NAME.DISTRIBUTE_VERTICAL,
        icon: "distribute_vertical",
        label: "垂直分布",
      },
    ],
  },
  {
    id: "layer",
    label: "图层与状态",
    icon: "layer",
    pluginId: BUILTIN_ACTION_BUTTONS_PLUGIN_ID,
    kind: "dropdown",
    order: 30,
    items: [
      {
        id: "bring-forward",
        command: ACTION_NAME.BRING_FORWARD,
        icon: "arrow-up",
        label: "上移一层",
      },
      {
        id: "send-backward",
        command: ACTION_NAME.SEND_BACKWARD,
        icon: "arrow-down",
        label: "下移一层",
      },
      {
        id: "bring-to-front",
        command: ACTION_NAME.BRING_TO_FRONT,
        icon: "arrow-up",
        label: "置于顶层",
      },
      {
        id: "send-to-back",
        command: ACTION_NAME.SEND_TO_BACK,
        icon: "arrow-down",
        label: "置于底层",
      },
      {
        id: "connectors-to-front",
        command: ACTION_NAME.CONNECTORS_TO_FRONT,
        icon: "draw_arrow",
        label: "连接线置顶",
      },
      { id: "lock-selected", command: ACTION_NAME.LOCK_SELECTED, icon: "lock", label: "锁定选中" },
      {
        id: "unlock-selected",
        command: ACTION_NAME.UNLOCK_SELECTED,
        icon: "unlock",
        label: "解锁选中",
      },
      {
        id: "toggle-visible",
        command: ACTION_NAME.TOGGLE_VISIBLE,
        icon: "visible",
        label: "切换显示",
      },
    ],
  },
  {
    id: "connector-label",
    label: "连接线标签",
    icon: "connector_label",
    pluginId: BUILTIN_ACTION_BUTTONS_PLUGIN_ID,
    kind: "button",
    order: 50,
    items: [
      {
        id: "add-connector-label",
        command: ACTION_NAME.ADD_CONNECTOR_LABEL,
        icon: "connector_label",
        label: "添加连线标签",
      },
    ],
  },
  {
    id: "danger",
    label: "危险操作",
    icon: "clear",
    pluginId: BUILTIN_ACTION_BUTTONS_PLUGIN_ID,
    kind: "button",
    order: 100,
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
];

export function registerDefaultActionButtons(editor: Editor) {
  DEFAULT_ACTION_BUTTON_GROUPS.forEach((group) => editor.actionButtons.register(group));
}
