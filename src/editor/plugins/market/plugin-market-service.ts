import type { Component } from "vue";
import type Editor from "../../editor";
import type { EditorPluginManifest, PluginConfigSchema } from "../../api/plugin";
import {
  getBuiltinPluginById,
  getEnabledPluginIds,
  listPluginMarketItems,
  saveEnabledPluginIds,
} from "./builtin-registry";
import {
  isPluginPurchased,
  isTemplatePurchased,
  listPurchasedTemplateActions,
  PREMIUM_PLUGIN_IDS,
  PREMIUM_TEMPLATE_ACTIONS,
  purchasePlugin,
  purchaseTemplate,
} from "./entitlements";

export type PluginContributionKind =
  | "tool"
  | "command"
  | "menu"
  | "action-button"
  | "view-control"
  | "property-panel";

export interface PluginContributionGroupSummary {
  kind: PluginContributionKind;
  label: string;
  count: number;
  items: string[];
}

export interface PluginMarketContributionSummary {
  total: number;
  groups: PluginContributionGroupSummary[];
}

export interface PluginMarketViewItem {
  manifest: EditorPluginManifest;
  builtin: boolean;
  enabled: boolean;
  active: boolean;
  contributions: PluginMarketContributionSummary;
  configurable: boolean;
  premium: boolean;
  purchased: boolean;
}

export function listInstalledPlugins(editor?: Editor): PluginMarketViewItem[] {
  return listPluginMarketItems().map((item) => ({
    ...item,
    active: editor?.pluginManager.isActive(item.manifest.id) ?? item.enabled,
    contributions: getPluginContributionSummary(editor, item.manifest.id),
    configurable: Boolean(item.manifest.configurable),
    premium: PREMIUM_PLUGIN_IDS.includes(item.manifest.id),
    purchased: isPluginPurchased(item.manifest.id),
  }));
}

export function buyPlugin(pluginId: string) {
  purchasePlugin(pluginId);
}

export interface TemplateMarketItem {
  action: string;
  title: string;
  description: string;
  category: "business" | "professional";
  premium: boolean;
  purchased: boolean;
}

const TEMPLATE_MARKET_ITEMS: Array<Omit<TemplateMarketItem, "purchased">> = [
  {
    action: "templateApproval",
    title: "审批流程",
    description: "标准审批流转节点与判断分支",
    category: "business",
    premium: false,
  },
  {
    action: "templateDecision",
    title: "判断分支",
    description: "单判断双分支的流程骨架",
    category: "business",
    premium: false,
  },
  {
    action: "templateLogin",
    title: "登录注册",
    description: "账号登录、注册、找回密码路径",
    category: "business",
    premium: false,
  },
  {
    action: "templateWorkOrder",
    title: "工单流转",
    description: "工单创建、分派、处理与完成",
    category: "business",
    premium: true,
  },
  {
    action: "templateCRM",
    title: "CRM 跟进",
    description: "线索、商机、推进和回访流程",
    category: "business",
    premium: true,
  },
  {
    action: "templatePayment",
    title: "支付流程",
    description: "下单、支付、回调和结果处理",
    category: "business",
    premium: true,
  },
  {
    action: "templateBpmnOrder",
    title: "BPMN 订单",
    description: "订单处理 BPMN 示例",
    category: "professional",
    premium: true,
  },
  {
    action: "templateSystemArchitecture",
    title: "系统架构",
    description: "常见服务化系统结构图",
    category: "professional",
    premium: true,
  },
  {
    action: "templateSwimlaneCollaboration",
    title: "泳道协作",
    description: "跨角色协作流程示例",
    category: "professional",
    premium: true,
  },
];

export function listTemplateMarketItems(): TemplateMarketItem[] {
  const purchased = new Set(listPurchasedTemplateActions());
  return TEMPLATE_MARKET_ITEMS.map((item) => ({
    ...item,
    purchased: purchased.has(item.action),
  }));
}

export function canUseTemplateAction(action: string) {
  if (!PREMIUM_TEMPLATE_ACTIONS.includes(action)) return true;
  return isTemplatePurchased(action);
}

export function buyTemplate(action: string) {
  if (!PREMIUM_TEMPLATE_ACTIONS.includes(action)) return;
  purchaseTemplate(action);
}

export function getPluginConfig(
  editor: Editor,
  pluginId: string,
): PluginConfigSchema | Component | null {
  const plugin = getBuiltinPluginById(pluginId);
  if (!plugin?.configure) return null;

  const ctx = {
    pluginId,
    editor,
    logger: {
      info: (msg: string) => console.info(`[plugin:${pluginId}] ${msg}`),
      warn: (msg: string) => console.warn(`[plugin:${pluginId}] ${msg}`),
      error: (msg: string, err?: unknown) => console.error(`[plugin:${pluginId}] ${msg}`, err),
    },
    storage: {
      get: <T>(key: string): T | null => {
        try {
          const raw = localStorage.getItem(`leafer-flow.plugin.${pluginId}.${key}`);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      },
      set: <T>(key: string, value: T): void => {
        localStorage.setItem(`leafer-flow.plugin.${pluginId}.${key}`, JSON.stringify(value));
      },
      remove: (key: string): void => {
        localStorage.removeItem(`leafer-flow.plugin.${pluginId}.${key}`);
      },
    },
  };

  return plugin.configure(ctx);
}

export async function enablePlugin(editor: Editor, pluginId: string): Promise<boolean> {
  const plugin = getBuiltinPluginById(pluginId);
  if (!plugin) return false;

  await editor.pluginManager.activate(plugin);
  saveEnabledPluginIds([...getEnabledPluginIds(), pluginId]);
  return true;
}

export async function disablePlugin(editor: Editor, pluginId: string): Promise<boolean> {
  const plugin = getBuiltinPluginById(pluginId);
  if (plugin?.manifest.required) return false;

  if (!editor.pluginManager.isActive(pluginId)) {
    saveEnabledPluginIds(getEnabledPluginIds().filter((id) => id !== pluginId));
    return true;
  }

  await editor.pluginManager.deactivate(pluginId);
  saveEnabledPluginIds(getEnabledPluginIds().filter((id) => id !== pluginId));
  return true;
}

function getPluginContributionSummary(editor: Editor | undefined, pluginId: string) {
  if (!editor) {
    return {
      total: 0,
      groups: [],
    };
  }

  const activeTools = editor.toolRegistry.listByPlugin(pluginId);
  const activeCommands = editor.commands.listByPlugin(pluginId);
  const activeMenus = editor.menus.listByPlugin(pluginId);
  const activeButtons = editor.actionButtons.listByPlugin(pluginId);
  const activeViewControls = editor.viewControls.listByPlugin(pluginId);
  const activePropertyPanels = editor.propertyPanels.listByPlugin(pluginId);
  const plugin = getBuiltinPluginById(pluginId);
  const toolLabels = activeTools.length
    ? activeTools.map((tool) => tool.label)
    : (plugin?.contributes?.tools ?? []);
  const commandLabels = activeCommands.length
    ? activeCommands.map((command) => command.label)
    : (plugin?.contributes?.commands ?? []);
  const menuLabels = activeMenus.length
    ? activeMenus.map((menu) => menu.label)
    : (plugin?.contributes?.menus ?? []);
  const buttonLabels = activeButtons.length
    ? activeButtons.flatMap((group) => [
        ...group.items.map((item) => item.label),
        ...(group.panelItems?.map((item) => item.label) ?? []),
      ])
    : (plugin?.contributes?.buttons ?? []);

  const viewControlLabels = activeViewControls.length
    ? activeViewControls.map((control) => control.label)
    : (plugin?.contributes?.viewControls ?? []);

  const propertyPanelLabels = activePropertyPanels.length
    ? activePropertyPanels.map((panel) => panel.title)
    : (plugin?.contributes?.propertyPanels ?? []);

  const groups = [
    createContributionGroup("tool", "工具贡献", toolLabels),
    createContributionGroup("command", "命令贡献", commandLabels),
    createContributionGroup("menu", "菜单贡献", menuLabels),
    createContributionGroup("action-button", "按钮贡献", buttonLabels),
    createContributionGroup("view-control", "视图控件贡献", viewControlLabels),
    createContributionGroup("property-panel", "属性面板贡献", propertyPanelLabels),
  ].filter((group) => group.count > 0);

  return {
    total: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
  };
}

function createContributionGroup(
  kind: PluginContributionKind,
  label: string,
  items: string[],
): PluginContributionGroupSummary {
  return {
    kind,
    label,
    count: items.length,
    items,
  };
}
