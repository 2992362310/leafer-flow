import { ACTION_NAME, BUILTIN_PLUGIN_ID } from "../../constants";
import type { CommandContribution } from "../../api/command";
import type Editor from "../../editor";
import { type IUI } from "leafer";
import { Connector } from "../../core/connector";
import { doAlign } from "../../action/do-align";
import { doClear } from "../../action/do-clear";
import { doCopy, doCut, doPaste, doDuplicate } from "../../action/do-clipboard";
import { doAddConnectorLabel } from "../../action/do-connector-label";
import { doConnectorToFront } from "../../action/do-connector-layer";
import { doAddConnectorWaypoint, doRemoveConnectorWaypoints } from "../../action/do-connector-waypoint";
import { doDelete } from "../../action/do-delete";
import { doGroup } from "../../action/do-group";
import { doImage } from "../../action/do-image";
import { doImportSVG } from "../../action/do-svg-import";
import { doLayer, doToggleLock, doToggleVisible, doUnlockAll, doUnlockAtCursor } from "../../action/do-layer";
import { doMoveLayer, type MoveLayerPayload } from "../../action/do-move-layer";
import { doNudge } from "../../action/do-nudge";
import { doRedo } from "../../action/do-redo";
import { doSelectAll } from "../../action/do-select-all";
import { doUndo } from "../../action/do-undo";
import { doUnGroup } from "../../action/do-ungroup";
import { getSnapEnabled, setSnapEnabled } from "../../core/drawing-settings";

const CORE_COMMANDS: CommandContribution[] = [
  {
    id: ACTION_NAME.CLEAR_CANVAS,
    label: "清空画布",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: doClear,
  },
  { id: ACTION_NAME.UNDO, label: "撤销", pluginId: BUILTIN_PLUGIN_ID, run: doUndo },
  { id: ACTION_NAME.REDO, label: "重做", pluginId: BUILTIN_PLUGIN_ID, run: doRedo },
  { id: ACTION_NAME.DELETE, label: "删除", pluginId: BUILTIN_PLUGIN_ID, run: doDelete },
  { id: ACTION_NAME.GROUP, label: "组合", pluginId: BUILTIN_PLUGIN_ID, run: doGroup },
  {
    id: ACTION_NAME.UNGROUP,
    label: "取消组合",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doUnGroup,
  },
  { id: ACTION_NAME.COPY, label: "复制", pluginId: BUILTIN_PLUGIN_ID, run: doCopy },
  { id: ACTION_NAME.CUT, label: "剪切", pluginId: BUILTIN_PLUGIN_ID, run: doCut },
  { id: ACTION_NAME.PASTE, label: "粘贴", pluginId: BUILTIN_PLUGIN_ID, run: doPaste },
  { id: ACTION_NAME.DUPLICATE, label: "原位复制", pluginId: BUILTIN_PLUGIN_ID, run: doDuplicate },
  {
    id: ACTION_NAME.ADD_CONNECTOR_LABEL,
    label: "添加连接线标签",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doAddConnectorLabel,
  },
  {
    id: ACTION_NAME.ADD_CONNECTOR_WAYPOINT,
    label: "添加连接线中间点",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (currentEditor) => {
      // 默认在连接线中点添加 waypoint
      const selected = currentEditor.app.editor.list as IUI[];
      const connector = selected.find((el) => el instanceof Connector) as Connector | undefined;
      if (!connector) return { success: false, message: "请先选择一条连接线" };
      const points = connector.getPoints();
      if (!points?.from || !points?.to) return { success: false, message: "无法获取连接线端点" };
      const mid = { x: (points.from.x + points.to.x) / 2, y: (points.from.y + points.to.y) / 2 };
      connector.addWaypoint(mid);
      currentEditor.commitMutation({ syncConnectorLabels: true });
      return { success: true, message: "已添加中间点" };
    },
  },
  {
    id: ACTION_NAME.REMOVE_CONNECTOR_WAYPOINTS,
    label: "移除连接线中间点",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: doRemoveConnectorWaypoints,
  },
  {
    id: ACTION_NAME.SELECT_ALL,
    label: "全选",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doSelectAll,
  },
  {
    id: ACTION_NAME.CONNECTORS_TO_FRONT,
    label: "连接线置顶",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doConnectorToFront,
  },
  {
    id: ACTION_NAME.FIND,
    label: "搜索",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      // 搜索 UI 由 CanvasSearch 组件处理，此命令仅触发打开
      window.dispatchEvent(new CustomEvent("leafer-flow:toggle-search"));
      return { success: true, message: "已打开搜索" };
    },
  },
  {
    id: "toggleHistoryPanel",
    label: "历史面板",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      window.dispatchEvent(new CustomEvent("leafer-flow:toggle-history"));
      return { success: true, message: "已切换历史面板" };
    },
  },
  {
    id: "toggleShortcutHelp",
    label: "快捷键帮助",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      window.dispatchEvent(new CustomEvent("leafer-flow:toggle-shortcut-help"));
      return { success: true, message: "" };
    },
  },
  {
    id: ACTION_NAME.INSERT_IMAGE,
    label: "插入图片",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doImage,
  },
  {
    id: ACTION_NAME.IMPORT_SVG,
    label: "导入 SVG",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doImportSVG,
  },
];

const ALIGN_ACTIONS = [
  ACTION_NAME.ALIGN_LEFT,
  ACTION_NAME.ALIGN_CENTER,
  ACTION_NAME.ALIGN_RIGHT,
  ACTION_NAME.ALIGN_TOP,
  ACTION_NAME.ALIGN_MIDDLE,
  ACTION_NAME.ALIGN_BOTTOM,
  ACTION_NAME.DISTRIBUTE_HORIZONTAL,
  ACTION_NAME.DISTRIBUTE_VERTICAL,
] as const;

const LAYER_ACTIONS = {
  [ACTION_NAME.BRING_FORWARD]: "bringForward",
  [ACTION_NAME.SEND_BACKWARD]: "sendBackward",
  [ACTION_NAME.BRING_TO_FRONT]: "bringToFront",
  [ACTION_NAME.SEND_TO_BACK]: "sendToBack",
} as const;

type NudgePayload = {
  x: number;
  y: number;
};

type UnlockAtCursorPayload = {
  x: number;
  y: number;
};

export function registerDefaultCommands(editor: Editor) {
  CORE_COMMANDS.forEach((command) => editor.commands.register(command));

  ALIGN_ACTIONS.forEach((action) => {
    editor.commands.register({
      id: action,
      label: action,
      pluginId: BUILTIN_PLUGIN_ID,
      run: (currentEditor) => doAlign(currentEditor, action),
    });
  });

  Object.entries(LAYER_ACTIONS).forEach(([id, layerAction]) => {
    editor.commands.register({
      id,
      label: id,
      pluginId: BUILTIN_PLUGIN_ID,
      run: (currentEditor) => doLayer(currentEditor, layerAction),
    });
  });

  editor.commands.register({
    id: ACTION_NAME.LOCK_SELECTED,
    label: "锁定选中元素",
    pluginId: BUILTIN_PLUGIN_ID,
    run: (currentEditor) => doToggleLock(currentEditor, true),
  });

  editor.commands.register({
    id: ACTION_NAME.UNLOCK_SELECTED,
    label: "解锁选中元素",
    pluginId: BUILTIN_PLUGIN_ID,
    run: (currentEditor) => doToggleLock(currentEditor, false),
  });

  editor.commands.register({
    id: ACTION_NAME.UNLOCK_ALL,
    label: "解锁所有元素",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doUnlockAll,
  });

  editor.commands.register<UnlockAtCursorPayload>({
    id: ACTION_NAME.UNLOCK_AT_CURSOR,
    label: "解锁此元素",
    pluginId: BUILTIN_PLUGIN_ID,
    match: parseUnlockAtCursor,
    run: (currentEditor, payload) =>
      doUnlockAtCursor(currentEditor, payload?.x ?? 0, payload?.y ?? 0),
  });

  editor.commands.register({
    id: ACTION_NAME.TOGGLE_VISIBLE,
    label: "切换可见性",
    pluginId: BUILTIN_PLUGIN_ID,
    run: (currentEditor) => {
      const selected = currentEditor.app.editor.list || [];
      return doToggleVisible(
        currentEditor,
        selected.some((item) => !item.visible),
      );
    },
  });

  editor.commands.register<MoveLayerPayload>({
    id: ACTION_NAME.MOVE_LAYER,
    label: "移动图层",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doMoveLayer,
  });

  editor.commands.register({
    id: ACTION_NAME.TOGGLE_SNAP,
    label: "切换吸附",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (currentEditor) => {
      const next = !getSnapEnabled();
      setSnapEnabled(next);
      currentEditor.snap?.enable(next);
      return { success: true, message: next ? "已开启吸附" : "已关闭吸附" };
    },
  });

  editor.commands.register<NudgePayload>({
    id: "nudge",
    label: "微移选中元素",
    pluginId: BUILTIN_PLUGIN_ID,
    match: parseNudgeAction,
    run: (currentEditor, payload) => doNudge(currentEditor, payload?.x ?? 0, payload?.y ?? 0),
  });
}

function parseNudgeAction(action: string): NudgePayload | null {
  const match = /^(nudgeLeft|nudgeRight|nudgeUp|nudgeDown)(?::(\d+))?$/.exec(action);
  if (!match) return null;

  const direction = match[1];
  const step = Number(match[2] || 1);
  return {
    x: direction === "nudgeLeft" ? -step : direction === "nudgeRight" ? step : 0,
    y: direction === "nudgeUp" ? -step : direction === "nudgeDown" ? step : 0,
  };
}

function parseUnlockAtCursor(action: string): UnlockAtCursorPayload | null {
  const match = /^unlockAtCursor:(\d+),(\d+)$/.exec(action);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}
