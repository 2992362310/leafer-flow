import { ACTION_NAME } from "@leafer-flow/core/constants";
import type { CommandContribution } from "@leafer-flow/core/api/command";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { TemplateRegistry, type TemplateKind } from "../../templates/registry";

const PLUGIN_ID = "leafer-flow.template-actions";

/**
 * Get template manager from editor context
 * Set by the templatesPlugin during activation
 */
function getTemplateManager(editor: unknown) {
  return (editor as Record<string, unknown>).__templateManager__;
}

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

export function createTemplateActionsPlugin(
  canUseTemplateAction: (action: string) => boolean = () => true,
): EditorPluginModule {
  const templateCommands: CommandContribution[] = Object.entries(TEMPLATE_ACTIONS).map(
    ([id, templateKind]) => ({
      id,
      label: id,
      pluginId: PLUGIN_ID,
      refreshZoom: true,
      run: async (editor) => {
        if (!canUseTemplateAction(id)) {
          return { success: false, message: "该模板尚未购买，请先在模板市场购买" };
        }

        const manager = getTemplateManager(editor);
        if (!manager) {
          return {
            success: false,
            message: "模板管理器未初始化。请确保 leafer-flow.templates 插件已启用。",
          };
        }

        return await (manager as unknown as { insertTemplate: Function }).insertTemplate(
          templateKind as TemplateKind,
        );
      },
    }),
  );

  return {
    manifest: {
      id: PLUGIN_ID,
      name: "模板操作",
      version: "1.1.2",
      description:
        "提供业务流程与专业图模板插入命令；依赖 leafer-flow.templates 插件；浏览与购买请使用模板市场。",
      category: "utility",
      capabilities: ["command", "template"],
      enabledByDefault: true,
      dependencies: ["leafer-flow.templates"],
    },
    contributes: {
      commands: ["业务流程模板", "专业图模板"],
    },
    activate(ctx) {
      templateCommands.forEach((command) => ctx.editor.commands.register(command));
    },
  };
}

export const templateActionsPlugin = createTemplateActionsPlugin();
