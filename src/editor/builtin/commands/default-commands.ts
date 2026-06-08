import { ACTION_NAME } from "../../constants";
import type { CommandContribution } from "../../api/command";
import type Editor from "../../editor";
import { doAlign } from "../../action/do-align";
import { doClear } from "../../action/do-clear";
import { doCopy, doPaste } from "../../action/do-clipboard";
import { doAddConnectorLabel } from "../../action/do-connector-label";
import { doConnectorToFront } from "../../action/do-connector-layer";
import { doDelete } from "../../action/do-delete";
import { doExportPNG, doExportSVG, doLoad, doSave } from "../../action/do-file";
import { doGroup } from "../../action/do-group";
import { doLayer, doToggleLock, doToggleVisible } from "../../action/do-layer";
import { doNudge } from "../../action/do-nudge";
import { doRedo } from "../../action/do-redo";
import { doSelectAll } from "../../action/do-select-all";
import { doInsertTemplate } from "../../action/do-template";
import { doUndo } from "../../action/do-undo";
import { doUnGroup } from "../../action/do-ungroup";
import { doViewAction } from "../../action/do-view";
import { getSnapEnabled, setSnapEnabled } from "../../core/drawing-settings";

export const BUILTIN_COMMANDS_PLUGIN_ID = "leafer-flow.builtin-commands";

const CORE_COMMANDS: CommandContribution[] = [
  {
    id: ACTION_NAME.CLEAR_CANVAS,
    label: "清空画布",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    warning: false,
    run: doClear,
  },
  { id: ACTION_NAME.UNDO, label: "撤销", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doUndo },
  { id: ACTION_NAME.REDO, label: "重做", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doRedo },
  { id: ACTION_NAME.DELETE, label: "删除", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doDelete },
  { id: ACTION_NAME.GROUP, label: "组合", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doGroup },
  {
    id: ACTION_NAME.UNGROUP,
    label: "取消组合",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: doUnGroup,
  },
  {
    id: ACTION_NAME.SAVE,
    label: "保存",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    warning: false,
    run: doSave,
  },
  {
    id: ACTION_NAME.LOAD,
    label: "加载",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    warning: false,
    run: doLoad,
  },
  {
    id: ACTION_NAME.EXPORT_PNG,
    label: "导出 PNG",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    warning: false,
    run: doExportPNG,
  },
  {
    id: ACTION_NAME.EXPORT_SVG,
    label: "导出 SVG",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    warning: false,
    run: doExportSVG,
  },
  { id: ACTION_NAME.COPY, label: "复制", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doCopy },
  { id: ACTION_NAME.PASTE, label: "粘贴", pluginId: BUILTIN_COMMANDS_PLUGIN_ID, run: doPaste },
  {
    id: ACTION_NAME.ADD_CONNECTOR_LABEL,
    label: "添加连接线标签",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: doAddConnectorLabel,
  },
  {
    id: ACTION_NAME.SELECT_ALL,
    label: "全选",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: doSelectAll,
  },
  {
    id: ACTION_NAME.CONNECTORS_TO_FRONT,
    label: "连接线置顶",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: doConnectorToFront,
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

const TEMPLATE_ACTIONS = {
  [ACTION_NAME.TEMPLATE_APPROVAL]: "approval",
  [ACTION_NAME.TEMPLATE_DECISION]: "decision",
  [ACTION_NAME.TEMPLATE_WORK_ORDER]: "workOrder",
  [ACTION_NAME.TEMPLATE_CRM]: "crm",
  [ACTION_NAME.TEMPLATE_LOGIN]: "login",
  [ACTION_NAME.TEMPLATE_PAYMENT]: "payment",
  [ACTION_NAME.TEMPLATE_BPMN_ORDER]: "bpmnOrder",
  [ACTION_NAME.TEMPLATE_SYSTEM_ARCHITECTURE]: "systemArchitecture",
  [ACTION_NAME.TEMPLATE_SWIMLANE_COLLABORATION]: "swimlaneCollaboration",
} as const;

const VIEW_ACTIONS = {
  [ACTION_NAME.VIEW_FIT]: "fit",
  [ACTION_NAME.VIEW_CENTER]: "center",
  [ACTION_NAME.ZOOM_IN]: "zoomIn",
  [ACTION_NAME.ZOOM_OUT]: "zoomOut",
  [ACTION_NAME.ZOOM_RESET]: "reset",
} as const;

type NudgePayload = {
  x: number;
  y: number;
};

export function registerDefaultCommands(editor: Editor) {
  CORE_COMMANDS.forEach((command) => editor.commands.register(command));

  ALIGN_ACTIONS.forEach((action) => {
    editor.commands.register({
      id: action,
      label: action,
      pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
      run: (currentEditor) => doAlign(currentEditor, action),
    });
  });

  Object.entries(LAYER_ACTIONS).forEach(([id, layerAction]) => {
    editor.commands.register({
      id,
      label: id,
      pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
      run: (currentEditor) => doLayer(currentEditor, layerAction),
    });
  });

  editor.commands.register({
    id: ACTION_NAME.LOCK_SELECTED,
    label: "锁定选中元素",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: (currentEditor) => doToggleLock(currentEditor, true),
  });

  editor.commands.register({
    id: ACTION_NAME.UNLOCK_SELECTED,
    label: "解锁选中元素",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: (currentEditor) => doToggleLock(currentEditor, false),
  });

  editor.commands.register({
    id: ACTION_NAME.TOGGLE_VISIBLE,
    label: "切换可见性",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    run: (currentEditor) => {
      const selected = currentEditor.app.editor.list || [];
      return doToggleVisible(
        currentEditor,
        selected.some((item) => !item.visible),
      );
    },
  });

  editor.commands.register({
    id: ACTION_NAME.TOGGLE_SNAP,
    label: "切换吸附",
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
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
    pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
    match: parseNudgeAction,
    run: (currentEditor, payload) => doNudge(currentEditor, payload?.x ?? 0, payload?.y ?? 0),
  });

  Object.entries(TEMPLATE_ACTIONS).forEach(([id, templateKind]) => {
    editor.commands.register({
      id,
      label: id,
      pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
      refreshZoom: true,
      run: (currentEditor) => doInsertTemplate(currentEditor, templateKind),
    });
  });

  Object.entries(VIEW_ACTIONS).forEach(([id, viewAction]) => {
    editor.commands.register({
      id,
      label: id,
      pluginId: BUILTIN_COMMANDS_PLUGIN_ID,
      refreshZoom: true,
      run: (currentEditor) => doViewAction(currentEditor, viewAction),
    });
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
