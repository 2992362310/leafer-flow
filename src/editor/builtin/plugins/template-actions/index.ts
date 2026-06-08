import { ACTION_NAME } from "../../../constants";
import type { ActionButtonGroupContribution } from "../../../api/action-button";
import type { CommandContribution } from "../../../api/command";
import type { EditorPluginModule } from "../../../api/plugin";
import { doInsertTemplate } from "../../../action/do-template";

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
    run: (editor) => doInsertTemplate(editor, templateKind),
  }),
);

const TEMPLATE_BUTTONS: ActionButtonGroupContribution[] = [
  {
    id: "template-business",
    label: "业务流程",
    icon: "template",
    pluginId: PLUGIN_ID,
    kind: "dropdown",
    order: 60,
    items: [
      {
        id: "template-approval",
        command: ACTION_NAME.TEMPLATE_APPROVAL,
        icon: "template",
        label: "审批流程",
      },
      {
        id: "template-decision",
        command: ACTION_NAME.TEMPLATE_DECISION,
        icon: "flow_decision",
        label: "判断分支",
      },
      {
        id: "template-work-order",
        command: ACTION_NAME.TEMPLATE_WORK_ORDER,
        icon: "flow_process",
        label: "工单流转",
      },
      {
        id: "template-crm",
        command: ACTION_NAME.TEMPLATE_CRM,
        icon: "template",
        label: "CRM 跟进",
      },
      {
        id: "template-login",
        command: ACTION_NAME.TEMPLATE_LOGIN,
        icon: "flow_start_end",
        label: "登录注册",
      },
      {
        id: "template-payment",
        command: ACTION_NAME.TEMPLATE_PAYMENT,
        icon: "flow_database",
        label: "支付流程",
      },
    ],
  },
  {
    id: "template-professional",
    label: "专业图",
    icon: "template",
    pluginId: PLUGIN_ID,
    kind: "dropdown",
    order: 70,
    items: [
      {
        id: "template-bpmn-order",
        command: ACTION_NAME.TEMPLATE_BPMN_ORDER,
        icon: "bpmn_start_event",
        label: "BPMN 订单",
      },
      {
        id: "template-system-architecture",
        command: ACTION_NAME.TEMPLATE_SYSTEM_ARCHITECTURE,
        icon: "arch_component",
        label: "系统架构",
      },
      {
        id: "template-swimlane-collaboration",
        command: ACTION_NAME.TEMPLATE_SWIMLANE_COLLABORATION,
        icon: "flow_swimlane",
        label: "泳道协作",
      },
    ],
  },
];

export const templateActionsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "模板操作",
    version: "1.0.0",
    description: "提供业务流程、BPMN、系统架构和泳道协作等模板插入能力。",
    category: "utility",
    capabilities: ["command", "action-button", "template"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["业务流程模板", "专业图模板"],
    buttons: ["审批流程", "判断分支", "工单流转", "CRM 跟进", "登录注册", "支付流程", "BPMN 订单", "系统架构", "泳道协作"],
  },
  activate(ctx) {
    TEMPLATE_COMMANDS.forEach((command) => ctx.editor.commands.register(command));
    TEMPLATE_BUTTONS.forEach((button) => ctx.editor.actionButtons.register(button));
  },
};
