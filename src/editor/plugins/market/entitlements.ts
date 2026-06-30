export interface LocalEntitlements {
  plugins: string[];
  templates: string[];
}

const ENTITLEMENTS_KEY = "leafer-flow.market.entitlements.v1";

export const PREMIUM_PLUGIN_IDS = [
  "leafer-flow.auto-layout",
  "leafer-flow.diagram-lint",
  "leafer-flow.minimap",
  "leafer-flow.multi-layer",
  "leafer-flow.custom-data-panel",
];

export const PREMIUM_TEMPLATE_ACTIONS = [
  "templateWorkOrder",
  "templateCRM",
  "templatePayment",
  "templateBpmnOrder",
  "templateSystemArchitecture",
  "templateSwimlaneCollaboration",
];

function getDefaultEntitlements(): LocalEntitlements {
  return {
    plugins: [],
    templates: [],
  };
}

export function getLocalEntitlements(): LocalEntitlements {
  try {
    const raw = localStorage.getItem(ENTITLEMENTS_KEY);
    if (!raw) return getDefaultEntitlements();

    const parsed = JSON.parse(raw) as Partial<LocalEntitlements>;
    return {
      plugins: Array.isArray(parsed.plugins) ? parsed.plugins.filter((id): id is string => typeof id === "string") : [],
      templates: Array.isArray(parsed.templates)
        ? parsed.templates.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return getDefaultEntitlements();
  }
}

function saveLocalEntitlements(entitlements: LocalEntitlements) {
  localStorage.setItem(
    ENTITLEMENTS_KEY,
    JSON.stringify({
      plugins: [...new Set(entitlements.plugins)],
      templates: [...new Set(entitlements.templates)],
    }),
  );
}

export function listPurchasedPluginIds() {
  return getLocalEntitlements().plugins;
}

export function listPurchasedTemplateActions() {
  return getLocalEntitlements().templates;
}

export function isPluginPurchased(pluginId: string) {
  return listPurchasedPluginIds().includes(pluginId);
}

export function isTemplatePurchased(actionId: string) {
  return listPurchasedTemplateActions().includes(actionId);
}

export function purchasePlugin(pluginId: string) {
  const current = getLocalEntitlements();
  current.plugins.push(pluginId);
  saveLocalEntitlements(current);
}

export function purchaseTemplate(actionId: string) {
  const current = getLocalEntitlements();
  current.templates.push(actionId);
  saveLocalEntitlements(current);
}
