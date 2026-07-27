import type { IconName } from "@/assets/icons";
import { ACTION_NAME } from "../constants";

export interface ActionToolPanelItem {
  id: string;
  label: string;
  command: string;
  icon?: IconName;
  danger?: boolean;
}

export interface ActionToolPanelSection {
  title?: string;
  items: ActionToolPanelItem[];
}

export const ALIGN_PANEL_SECTIONS: ActionToolPanelSection[] = [
  {
    title: "对齐",
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
    ],
  },
  {
    title: "分布",
    items: [
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
];

export const LAYER_TOOLS_PANEL_SECTIONS: ActionToolPanelSection[] = [
  {
    title: "层级",
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
    ],
  },
  {
    title: "状态",
    items: [
      { id: "lock-selected", command: ACTION_NAME.LOCK_SELECTED, icon: "lock", label: "锁定选中" },
      {
        id: "unlock-selected",
        command: ACTION_NAME.UNLOCK_SELECTED,
        icon: "unlock",
        label: "解锁选中",
      },
      {
        id: "unlock-all",
        command: ACTION_NAME.UNLOCK_ALL,
        icon: "unlock",
        label: "解锁所有元素",
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
    title: "翻转",
    items: [
      {
        id: "flip-horizontal",
        command: ACTION_NAME.FLIP_HORIZONTAL,
        icon: "distribute_horizontal",
        label: "水平翻转",
      },
      {
        id: "flip-vertical",
        command: ACTION_NAME.FLIP_VERTICAL,
        icon: "distribute_vertical",
        label: "垂直翻转",
      },
    ],
  },
];

export const EXPORT_PANEL_SECTIONS: ActionToolPanelSection[] = [
  {
    title: "格式",
    items: [
      { id: "export-png", command: ACTION_NAME.EXPORT_PNG, icon: "export", label: "导出 PNG" },
      { id: "export-svg", command: ACTION_NAME.EXPORT_SVG, icon: "export", label: "导出 SVG" },
      { id: "export-pdf", command: ACTION_NAME.EXPORT_PDF, icon: "export", label: "导出 PDF" },
    ],
  },
];

