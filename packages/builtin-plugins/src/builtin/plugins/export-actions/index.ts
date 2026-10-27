import { ACTION_NAME } from "@leafer-flow/core/constants";
import type { ActionButtonGroupContribution } from "@leafer-flow/core/api/action-button";
import type { CommandContribution } from "@leafer-flow/core/api/command";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { dispatchPanelToggle } from "@leafer-flow/core/api/panel-toggle";
import { doExportPNG, doExportSVG, doExportPDF } from "@leafer-flow/core/action/do-file";

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
  {
    id: ACTION_NAME.EXPORT_PDF,
    label: "导出 PDF",
    pluginId: PLUGIN_ID,
    warning: false,
    run: doExportPDF,
  },
  {
    id: "toggleExportPanel",
    label: "导出",
    pluginId: PLUGIN_ID,
    warning: false,
    run: (editor) => {
      dispatchPanelToggle(editor, "export-panel");
      return { success: true, message: "已切换导出面板" };
    },
  },
];

const EXPORT_BUTTONS: ActionButtonGroupContribution = {
  id: "export",
  label: "导出",
  icon: "export",
  pluginId: PLUGIN_ID,
  kind: "button",
  surface: "file",
  order: 20,
  items: [
    {
      id: "toggle-export-panel",
      label: "导出",
      command: "toggleExportPanel",
      icon: "export",
      panelId: "export-panel",
    },
  ],
};

export const exportActionsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "导出操作",
    version: "1.1.0",
    description: "提供 PNG、SVG、PDF 导出能力。",
    category: "export",
    capabilities: ["command", "action-button", "export"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["导出 PNG", "导出 SVG", "导出 PDF"],
    buttons: ["导出"],
  },
  activate(ctx) {
    EXPORT_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
    ctx.editor.actionButtons.register(EXPORT_BUTTONS);
  },
};
