import type { ActionButtonGroupContribution } from "@leafer-flow/core/api/action-button";
import type { CommandContribution } from "@leafer-flow/core/api/command";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { dispatchPanelToggle } from "@leafer-flow/core/api/panel-toggle";

const PLUGIN_ID = "leafer-flow.drawing-settings";

const DRAWING_SETTINGS_COMMAND: CommandContribution = {
  id: "toggleDrawingSettings",
  label: "绘图设置",
  pluginId: PLUGIN_ID,
  warning: false,
  run: () => {
    dispatchPanelToggle("drawing-settings");
    return { success: true, message: "已切换绘图设置" };
  },
};

const DRAWING_SETTINGS_BUTTON: ActionButtonGroupContribution = {
  id: "drawing-settings",
  label: "绘图设置",
  icon: "template",
  pluginId: PLUGIN_ID,
  kind: "button",
  surface: "panel",
  order: 20,
  items: [
    {
      id: "drawing-settings-toggle",
      label: "绘图设置",
      command: "toggleDrawingSettings",
      icon: "template",
      panelId: "drawing-settings",
      order: 10,
    },
  ],
};

export const drawingSettingsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "绘制设置",
    version: "1.1.0",
    description: "提供连线样式、自由绘制平滑度和吸附开关设置面板。",
    category: "panel",
    capabilities: ["command", "action-button", "settings"],
    enabledByDefault: true,
  },
  contributes: {
    buttons: ["绘图设置面板"],
    commands: ["切换绘图设置"],
  },
  activate(ctx) {
    ctx.editor.commands.register(DRAWING_SETTINGS_COMMAND);
    ctx.editor.actionButtons.register(DRAWING_SETTINGS_BUTTON);
  },
};
