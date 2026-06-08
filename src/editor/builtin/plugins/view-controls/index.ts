import { ACTION_NAME } from "../../../constants";
import type { CommandContribution } from "../../../api/command";
import type { EditorPluginModule } from "../../../api/plugin";
import type { ViewControlContribution } from "../../../api/view-control";
import { doViewAction } from "../../../action/do-view";

const PLUGIN_ID = "leafer-flow.view-controls";

const VIEW_ACTIONS = {
  [ACTION_NAME.VIEW_FIT]: "fit",
  [ACTION_NAME.VIEW_CENTER]: "center",
  [ACTION_NAME.ZOOM_IN]: "zoomIn",
  [ACTION_NAME.ZOOM_OUT]: "zoomOut",
  [ACTION_NAME.ZOOM_RESET]: "reset",
} as const;

const VIEW_COMMANDS: CommandContribution[] = Object.entries(VIEW_ACTIONS).map(([id, viewAction]) => ({
  id,
  label: id,
  pluginId: PLUGIN_ID,
  refreshZoom: true,
  run: (editor) => doViewAction(editor, viewAction),
}));

const VIEW_CONTROLS: ViewControlContribution[] = [
  {
    id: "zoom-out",
    label: "缩小",
    command: ACTION_NAME.ZOOM_OUT,
    pluginId: PLUGIN_ID,
    text: "-",
    order: 10,
  },
  {
    id: "zoom-reset",
    label: "恢复 100%",
    command: ACTION_NAME.ZOOM_RESET,
    pluginId: PLUGIN_ID,
    zoomLabel: true,
    order: 20,
  },
  {
    id: "zoom-in",
    label: "放大",
    command: ACTION_NAME.ZOOM_IN,
    pluginId: PLUGIN_ID,
    text: "+",
    order: 30,
  },
  {
    id: "view-fit",
    label: "适应内容",
    command: ACTION_NAME.VIEW_FIT,
    pluginId: PLUGIN_ID,
    icon: "select",
    order: 40,
  },
  {
    id: "view-center",
    label: "居中内容",
    command: ACTION_NAME.VIEW_CENTER,
    pluginId: PLUGIN_ID,
    icon: "align_center",
    order: 50,
  },
];

export const viewControlsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "视图控件",
    version: "1.0.0",
    description: "提供缩放、适应内容和居中内容等底部视图控件。",
    category: "panel",
    capabilities: ["command", "view-control"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["缩小", "恢复 100%", "放大", "适应内容", "居中内容"],
    viewControls: ["缩小", "恢复 100%", "放大", "适应内容", "居中内容"],
  },
  activate(ctx) {
    VIEW_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
    VIEW_CONTROLS.forEach((control) => ctx.editor.viewControls.register(control));
  },
};
