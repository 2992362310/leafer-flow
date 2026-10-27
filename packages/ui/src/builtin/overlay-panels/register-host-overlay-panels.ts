import { defineAsyncComponent, type Component } from "vue";
import type Editor from "@leafer-flow/core/editor";
import { BUILTIN_PLUGIN_ID } from "@leafer-flow/core/constants";

import {
  ALIGN_PANEL_SECTIONS,
  EXPORT_PANEL_SECTIONS,
  LAYER_TOOLS_PANEL_SECTIONS,
} from "../action-tool-panels";

export function registerHostOverlayPanels(
  editor: Editor,
  marketPanels: { pluginMarket: Component; templateMarket: Component },
) {
  editor.overlayPanels.register({
    id: "canvas-search",
    label: "搜索",
    icon: "select",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/CanvasSearch.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 10,
  });

  editor.overlayPanels.register({
    id: "history-panel",
    label: "历史",
    icon: "undo",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/HistoryPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 20,
  });

  editor.overlayPanels.register({
    id: "plugin-market",
    label: "插件市场",
    icon: "export",
    pluginId: BUILTIN_PLUGIN_ID,
    component: marketPanels.pluginMarket,
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 30,
  });

  editor.overlayPanels.register({
    id: "shortcut-help",
    label: "快捷键",
    icon: "info",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/ShortcutHelp.vue")),
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 35,
  });

  editor.overlayPanels.register({
    id: "drawing-settings",
    label: "绘图设置",
    icon: "template",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/DrawingSettingsPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 36,
  });

  editor.overlayPanels.register({
    id: "template-market",
    label: "模板市场",
    icon: "template",
    pluginId: BUILTIN_PLUGIN_ID,
    component: marketPanels.templateMarket,
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 37,
  });

  editor.overlayPanels.register({
    id: "align-panel",
    label: "对齐与分布",
    icon: "align_center",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 40,
    props: {
      panelId: "align-panel",
      title: "对齐与分布",
      icon: "align_center",
      layout: "grid",
      sections: ALIGN_PANEL_SECTIONS,
    },
  });

  editor.overlayPanels.register({
    id: "connector-panel",
    label: "连线中心",
    icon: "draw_arrow",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/ConnectorPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 39,
  });

  editor.overlayPanels.register({
    id: "layer-tools-panel",
    label: "图层与状态",
    icon: "layer",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 41,
    props: {
      panelId: "layer-tools-panel",
      title: "图层与状态",
      icon: "layer",
      layout: "list",
      sections: LAYER_TOOLS_PANEL_SECTIONS,
    },
  });

  editor.overlayPanels.register({
    id: "export-panel",
    label: "导出",
    icon: "export",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("../../components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 42,
    props: {
      panelId: "export-panel",
      title: "导出",
      icon: "export",
      layout: "list",
      sections: EXPORT_PANEL_SECTIONS,
    },
  });
}
