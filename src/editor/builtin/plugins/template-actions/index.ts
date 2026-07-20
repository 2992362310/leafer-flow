import { ACTION_NAME } from "../../../constants";
import type { CommandContribution } from "../../../api/command";
import type { EditorPluginModule } from "../../../api/plugin";
import { doInsertTemplate } from "../../../action/do-template";
import { canUseTemplateAction } from "../../../plugins/market/plugin-market-service";

const PLUGIN_ID = "leafer-flow.template-actions";

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

const TEMPLATE_COMMANDS: CommandContribution[] = Object.entries(TEMPLATE_ACTIONS).map(
  ([id, templateKind]) => ({
    id,
    label: id,
    pluginId: PLUGIN_ID,
    refreshZoom: true,
    run: (editor) => {
      if (!canUseTemplateAction(id)) {
        return { success: false, message: "该模板尚未购买，请先在模板市场购买" };
      }
      return doInsertTemplate(editor, templateKind);
    },
  }),
);

export const templateActionsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "模板操作",
    version: "1.1.2",
    description: "提供业务流程与专业图模板插入命令；浏览与购买请使用模板市场。",
    category: "utility",
    capabilities: ["command", "template"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["业务流程模板", "专业图模板"],
  },
  activate(ctx) {
    TEMPLATE_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
  },
};
