import type { EditorPluginModule } from "../../../api/plugin";
import type { PropertyPanelContext } from "../../../api/property-panel";
import { CUSTOM_DATA_PROP } from "../../../core/flow-serialization";
import CustomDataPropertyPanel from "./CustomDataPropertyPanel.vue";

const PLUGIN_ID = "leafer-flow.custom-data-panel";

export const customDataPanelPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "自定义数据面板",
    version: "1.0.0",
    description: "示例属性面板插件，用于编辑选中元素的自定义 JSON 数据。",
    category: "property",
    capabilities: ["property-panel", "property-field"],
    enabledByDefault: false,
  },
  contributes: {
    propertyPanels: ["自定义数据", "业务字段示例"],
  },
  activate(ctx) {
    ctx.editor.propertyPanels.register({
      id: "custom-data-panel.custom-data",
      title: "自定义数据",
      pluginId: PLUGIN_ID,
      order: 200,
      component: CustomDataPropertyPanel,
      match: (context) => Boolean(context.selectedElement) && !context.isMultiSelection,
    });

    ctx.editor.propertyPanels.registerFields({
      id: "custom-data-panel.business-fields",
      title: "业务字段示例",
      pluginId: PLUGIN_ID,
      order: 210,
      match: (context) => Boolean(context.selectedElement) && !context.isMultiSelection,
      fields: [
        {
          key: "businessId",
          label: "业务 ID",
          type: "text",
          placeholder: "例如：node-001",
          order: 10,
          getValue: (context) => getCustomDataValue(context, "businessId", ""),
          setValue: (context, value) => setCustomDataValue(context, "businessId", value),
        },
        {
          key: "nodeType",
          label: "节点类型",
          type: "select",
          order: 20,
          options: [
            { label: "普通", value: "normal" },
            { label: "审批", value: "approval" },
            { label: "通知", value: "notice" },
          ],
          getValue: (context) => getCustomDataValue(context, "nodeType", "normal"),
          setValue: (context, value) => setCustomDataValue(context, "nodeType", value),
        },
        {
          key: "enabled",
          label: "启用业务节点",
          type: "checkbox",
          order: 30,
          getValue: (context) => getCustomDataValue(context, "enabled", false),
          setValue: (context, value) => setCustomDataValue(context, "enabled", value),
        },
        {
          key: "description",
          label: "业务说明",
          type: "textarea",
          placeholder: "填写业务说明...",
          order: 40,
          getValue: (context) => getCustomDataValue(context, "description", ""),
          setValue: (context, value) => setCustomDataValue(context, "description", value),
        },
      ],
    });
  },
};

function getCustomData(context: PropertyPanelContext) {
  const element = context.selectedElement;
  if (!element) return {};

  const record = element as unknown as Record<string, unknown>;
  const data = record[CUSTOM_DATA_PROP];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  record[CUSTOM_DATA_PROP] = {};
  return record[CUSTOM_DATA_PROP] as Record<string, unknown>;
}

function getCustomDataValue<T>(context: PropertyPanelContext, key: string, fallback: T): T {
  const value = getCustomData(context)[key];
  return value === undefined ? fallback : (value as T);
}

function setCustomDataValue(context: PropertyPanelContext, key: string, value: unknown) {
  getCustomData(context)[key] = value;
}
