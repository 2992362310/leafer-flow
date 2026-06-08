import type Editor from "@/editor/editor";
import type { PropertyPanelContribution } from "@/editor/api/property-panel";
import ConnectorPropertyPanel from "@/components/EditorPanel/builtin/ConnectorPropertyPanel.vue";
import GeometryPanel from "@/components/EditorPanel/builtin/GeometryPropertyPanel.vue";
import ShapeStylePanel from "@/components/EditorPanel/builtin/ShapeStylePropertyPanel.vue";
import StylePresetPanel from "@/components/EditorPanel/builtin/StylePresetPropertyPanel.vue";
import TextPropertyPanel from "@/components/EditorPanel/builtin/TextPropertyPanel.vue";

const PLUGIN_ID = "leafer-flow.builtin-core";

export function registerDefaultPropertyPanels(editor: Editor) {
  const panels: PropertyPanelContribution[] = [
    {
      id: "builtin.style-presets",
      title: "样式预设",
      pluginId: PLUGIN_ID,
      order: 10,
      component: StylePresetPanel,
      hideTitle: true,
      match: (context) => context.hasSelection,
    },
    {
      id: "builtin.geometry",
      title: "位置尺寸",
      pluginId: PLUGIN_ID,
      order: 20,
      component: GeometryPanel,
      match: (context) => context.hasSelection,
    },
    {
      id: "builtin.shape-style",
      title: "形状样式",
      pluginId: PLUGIN_ID,
      order: 30,
      component: ShapeStylePanel,
      match: (context) => Boolean(context.selectedShape),
    },
    {
      id: "builtin.connector",
      title: "连接线",
      pluginId: PLUGIN_ID,
      order: 40,
      component: ConnectorPropertyPanel,
      match: (context) => context.hasSelectedConnector,
    },
    {
      id: "builtin.text",
      title: "文本",
      pluginId: PLUGIN_ID,
      order: 50,
      component: TextPropertyPanel,
      match: (context) => Boolean(context.selectedText),
    },
  ];

  panels.forEach((panel) => editor.propertyPanels.register(panel));
}
