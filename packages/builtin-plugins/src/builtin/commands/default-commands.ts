import { ACTION_NAME, BUILTIN_PLUGIN_ID } from "@leafer-flow/core/constants";
import type { CommandContribution } from "@leafer-flow/core/api/command";
import type Editor from "@leafer-flow/core/editor";
import { type IUI } from "leafer";
import { Connector } from "@leafer-flow/core/core/connector";
import { doAlign } from "@leafer-flow/core/action/do-align";
import { doClear } from "@leafer-flow/core/action/do-clear";
import { doCopy, doCut, doPaste, doDuplicate } from "@leafer-flow/core/action/do-clipboard";
import { doAddConnectorLabel } from "@leafer-flow/core/action/do-connector-label";
import { doConnectorToFront } from "@leafer-flow/core/action/do-connector-layer";
import { doRemoveConnectorWaypoints } from "@leafer-flow/core/action/do-connector-waypoint";
import { doDelete } from "@leafer-flow/core/action/do-delete";
import { doFlip } from "@leafer-flow/core/action/do-flip";
import { doFormatPainterCopy, doFormatPainterApply } from "@leafer-flow/core/action/do-format-painter";
import { doGroup } from "@leafer-flow/core/action/do-group";
import { doImage } from "@leafer-flow/core/action/do-image";
import { doImportSVG } from "@leafer-flow/core/action/do-svg-import";
import { doLayer, doToggleLock, doToggleVisible, doUnlockAll, doUnlockAtCursor } from "@leafer-flow/core/action/do-layer";
import { doMoveLayer, type MoveLayerPayload } from "@leafer-flow/core/action/do-move-layer";
import { doNudge } from "@leafer-flow/core/action/do-nudge";
import { doRedo } from "@leafer-flow/core/action/do-redo";
import { doSelectAll } from "@leafer-flow/core/action/do-select-all";
import { doSelectByType } from "@leafer-flow/core/action/do-select-by-type";
import { doUndo } from "@leafer-flow/core/action/do-undo";
import { doUnGroup } from "@leafer-flow/core/action/do-ungroup";
import {
  getSnapEnabled,
  setSnapEnabled,
  setConnectorRouteType,
  type ConnectorRouteType,
} from "@leafer-flow/core/core/drawing-settings";
import { dispatchPanelToggle } from "@leafer-flow/core/api/panel-toggle";

function getSelectedConnectors(editor: Editor): Connector[] {
  return ((editor.app.editor.list as IUI[] | undefined) ?? []).filter(
    (item): item is Connector => item instanceof Connector,
  );
}

function applyRouteTypeToSelection(editor: Editor, routeType: ConnectorRouteType) {
  const selectedConnectors = getSelectedConnectors(editor);
  if (selectedConnectors.length === 0) return 0;

  selectedConnectors.forEach((connector) => {
    connector.routeType = routeType;
    connector.update();
  });

  editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
  return selectedConnectors.length;
}

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
      dispatchPanelToggle("canvas-search");
      return { success: true, message: "已打开搜索" };
    },
  },
  {
    id: "toggleLayerPanel",
    label: "图层树",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("layer-panel");
      return { success: true, message: "已切换图层树" };
    },
  },
  {
    id: "togglePluginMarket",
    label: "插件市场",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("plugin-market");
      return { success: true, message: "已切换插件市场" };
    },
  },
  {
    id: "toggleTemplateMarket",
    label: "模板市场",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("template-market");
      return { success: true, message: "已切换模板市场" };
    },
  },
  {
    id: "toggleHistoryPanel",
    label: "历史面板",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("history-panel");
      return { success: true, message: "已切换历史面板" };
    },
  },
  {
    id: "toggleShortcutHelp",
    label: "快捷键帮助",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("shortcut-help");
      return { success: true, message: "" };
    },
  },
  {
    id: "toggleAlignPanel",
    label: "对齐与分布",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("align-panel");
      return { success: true, message: "已切换对齐与分布" };
    },
  },
  {
    id: "toggleConnectorPanel",
    label: "连线中心",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("connector-panel");
      return { success: true, message: "已切换连线中心" };
    },
  },
  {
    id: "openConnectorPanel",
    label: "打开连线中心",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      window.dispatchEvent(new CustomEvent("leafer-flow:open-connector-panel"));
      return { success: true, message: "已打开连线中心" };
    },
  },
  {
    id: "toggleLayerToolsPanel",
    label: "图层与状态",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: () => {
      dispatchPanelToggle("layer-tools-panel");
      return { success: true, message: "已切换图层与状态" };
    },
  },
  {
    id: ACTION_NAME.CONNECTOR_ROUTE_ORTHOGONAL,
    label: "连线样式-直角",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (editor) => {
      setConnectorRouteType("orthogonal");
      const affected = applyRouteTypeToSelection(editor, "orthogonal");
      return {
        success: true,
        message:
          affected > 0
            ? `连线样式已切换为直角线（已应用 ${affected} 条选中连线）`
            : "连线样式已切换为直角线",
      };
    },
  },
  {
    id: ACTION_NAME.CONNECTOR_ROUTE_BEZIER,
    label: "连线样式-曲线",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (editor) => {
      setConnectorRouteType("bezier");
      const affected = applyRouteTypeToSelection(editor, "bezier");
      return {
        success: true,
        message:
          affected > 0
            ? `连线样式已切换为曲线（已应用 ${affected} 条选中连线）`
            : "连线样式已切换为曲线",
      };
    },
  },
  {
    id: ACTION_NAME.CONNECTOR_ROUTE_STRAIGHT,
    label: "连线样式-直线",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (editor) => {
      setConnectorRouteType("straight");
      const affected = applyRouteTypeToSelection(editor, "straight");
      return {
        success: true,
        message:
          affected > 0
            ? `连线样式已切换为直线（已应用 ${affected} 条选中连线）`
            : "连线样式已切换为直线",
      };
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
  {
    id: ACTION_NAME.FLIP_HORIZONTAL,
    label: "水平翻转",
    pluginId: BUILTIN_PLUGIN_ID,
    run: (editor) => doFlip(editor, "x"),
  },
  {
    id: ACTION_NAME.FLIP_VERTICAL,
    label: "垂直翻转",
    pluginId: BUILTIN_PLUGIN_ID,
    run: (editor) => doFlip(editor, "y"),
  },
  {
    id: ACTION_NAME.SELECT_BY_TYPE,
    label: "选择同类型元素",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doSelectByType,
  },
  {
    id: ACTION_NAME.FORMAT_PAINTER_COPY,
    label: "复制样式",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doFormatPainterCopy,
  },
  {
    id: ACTION_NAME.FORMAT_PAINTER_APPLY,
    label: "应用样式",
    pluginId: BUILTIN_PLUGIN_ID,
    run: doFormatPainterApply,
  },
  {
    id: ACTION_NAME.SELECT_ALL_CONNECTORS,
    label: "选中全部连线",
    pluginId: BUILTIN_PLUGIN_ID,
    warning: false,
    run: (editor) => {
      const connectors = ((editor.app.tree.children as IUI[] | undefined) ?? []).filter(
        (item): item is Connector => item instanceof Connector,
      );
      if (connectors.length === 0) {
        return { success: false, message: "画布中没有连线" };
      }
      editor.app.editor.select(connectors);
      return { success: true, message: `已选中 ${connectors.length} 条连线` };
    },
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
