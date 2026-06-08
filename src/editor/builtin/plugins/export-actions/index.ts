import { ACTION_NAME } from "../../../constants";
import type { ActionButtonGroupContribution } from "../../../api/action-button";
import type { CommandContribution } from "../../../api/command";
import type { EditorPluginModule } from "../../../api/plugin";
import { doExportPNG, doExportSVG } from "../../../action/do-file";

const PLUGIN_ID = "leafer-flow.export-actions";

const EXPORT_COMMANDS: CommandContribution[] = [
  {
    id: ACTION_NAME.EXPORT_PNG,
    label: "导出 PNG",
    pluginId: PLUGIN_ID,
    warning: false,
    run: doExportPNG,
  },
  {
    id: ACTION_NAME.EXPORT_SVG,
    label: "导出 SVG",
    pluginId: PLUGIN_ID,
    warning: false,
    run: doExportSVG,
  },
];

const EXPORT_BUTTONS: ActionButtonGroupContribution = {
  id: "export",
  label: "导出",
  icon: "export",
  pluginId: PLUGIN_ID,
  kind: "dropdown",
  order: 90,
  items: [
    { id: "export-png", command: ACTION_NAME.EXPORT_PNG, icon: "export", label: "导出 PNG" },
    { id: "export-svg", command: ACTION_NAME.EXPORT_SVG, icon: "export", label: "导出 SVG" },
  ],
};

export const exportActionsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "导出操作",
    version: "1.0.0",
    description: "提供 PNG 和 SVG 导出能力。",
    category: "export",
    capabilities: ["command", "action-button", "export"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["导出 PNG", "导出 SVG"],
    buttons: ["导出 PNG", "导出 SVG"],
  },
  activate(ctx) {
    EXPORT_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
    ctx.editor.actionButtons.register(EXPORT_BUTTONS);
  },
};
