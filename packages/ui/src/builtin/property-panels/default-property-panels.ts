import type Editor from "@leafer-flow/core/editor";
import type { PropertyPanelContext, PropertyPanelContribution } from "@leafer-flow/core/api/property-panel";
import { IMAGE_FILTERS, normalizeImageFilterSettings } from "@leafer-flow/core";
import ConnectorPropertyPanel from "../../components/EditorPanel/builtin/ConnectorPropertyPanel.vue";
import GeometryPanel from "../../components/EditorPanel/builtin/GeometryPropertyPanel.vue";
import ImageFilterPropertyPanel from "../../components/EditorPanel/builtin/ImageFilterPropertyPanel.vue";
import ShapeStylePanel from "../../components/EditorPanel/builtin/ShapeStylePropertyPanel.vue";
import StylePresetPanel from "../../components/EditorPanel/builtin/StylePresetPropertyPanel.vue";
import TextPropertyPanel from "../../components/EditorPanel/builtin/TextPropertyPanel.vue";
import VideoPropertyPanel from "../../components/EditorPanel/builtin/VideoPropertyPanel.vue";

const PLUGIN_ID = "leafer-flow.builtin-core";

function isSingleImage(context: PropertyPanelContext) {
  if (!context.selectedElement || context.isMultiSelection) return false;
  const node = context.editor.document.getNode(context.editor.renderer.getId(context.selectedElement));
  return node?.type === "Image";
}

function isSingleVideo(context: PropertyPanelContext) {
  if (!context.selectedElement || context.isMultiSelection) return false;
  const node = context.editor.document.getNode(context.editor.renderer.getId(context.selectedElement));
  return node?.type === "Video";
}

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
      id: "builtin.image-filters",
      title: "图片滤镜",
      pluginId: PLUGIN_ID,
      order: 35,
      component: ImageFilterPropertyPanel,
      match: isSingleImage,
    },
    {
      id: "builtin.video",
      title: "视频",
      pluginId: PLUGIN_ID,
      order: 37,
      component: VideoPropertyPanel,
      match: isSingleVideo,
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
