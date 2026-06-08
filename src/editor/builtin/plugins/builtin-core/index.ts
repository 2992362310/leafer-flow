import type { EditorPluginModule } from "../../../api/plugin";
import { registerDefaultActionButtons } from "../../commands/default-action-buttons";
import { registerDefaultCommands } from "../../commands/default-commands";
import { registerDefaultMenus } from "../../commands/default-menus";

const PLUGIN_ID = "leafer-flow.builtin-core";

export const builtinCorePlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "核心编辑命令",
    version: "1.0.0",
    description: "提供默认命令、右键菜单和顶部操作按钮。",
    category: "utility",
    capabilities: ["command", "menu", "action-button"],
    enabledByDefault: true,
    required: true,
  },
  contributes: {
    commands: ["默认编辑命令"],
    menus: ["默认右键菜单"],
    buttons: ["默认操作按钮"],
  },
  activate(ctx) {
    registerDefaultCommands(ctx.editor);
    registerDefaultMenus(ctx.editor);
    registerDefaultActionButtons(ctx.editor);
  },
};
