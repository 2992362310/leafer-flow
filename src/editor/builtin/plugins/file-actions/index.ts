import { ACTION_NAME } from "../../../constants";
import type { ActionButtonGroupContribution } from "../../../api/action-button";
import type { CommandContribution } from "../../../api/command";
import type { EditorPluginModule } from "../../../api/plugin";
import { doLoad, doSave } from "../../../action/do-file";

const PLUGIN_ID = "leafer-flow.file-actions";

const FILE_COMMANDS: CommandContribution[] = [
  {
    id: ACTION_NAME.SAVE,
    label: "保存",
    pluginId: PLUGIN_ID,
    warning: false,
    run: doSave,
  },
  {
    id: ACTION_NAME.LOAD,
    label: "加载",
    pluginId: PLUGIN_ID,
    warning: false,
    run: doLoad,
  },
];

const FILE_BUTTONS: ActionButtonGroupContribution = {
  id: "file",
  label: "文件",
  icon: "save",
  pluginId: PLUGIN_ID,
  kind: "button",
  order: 80,
  items: [
    { id: "save", label: "保存 (Ctrl+S)", command: ACTION_NAME.SAVE, icon: "save", order: 10 },
    { id: "load", label: "打开文件", command: ACTION_NAME.LOAD, icon: "load", order: 20 },
  ],
};

export const fileActionsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "文件操作",
    version: "1.0.0",
    description: "提供保存和打开流程文件能力。",
    category: "utility",
    capabilities: ["command", "action-button", "file"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["保存", "加载"],
    buttons: ["保存", "打开文件"],
  },
  activate(ctx) {
    FILE_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
    ctx.editor.actionButtons.register(FILE_BUTTONS);
  },
};
