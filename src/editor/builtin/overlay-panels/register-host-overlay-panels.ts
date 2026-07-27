import { defineAsyncComponent } from "vue";
import type Editor from "@/editor/editor";
import { BUILTIN_PLUGIN_ID } from "../../constants";
import { getPanelToggleEvent } from "../../api/panel-toggle";
import {
  ALIGN_PANEL_SECTIONS,
  EXPORT_PANEL_SECTIONS,
  LAYER_TOOLS_PANEL_SECTIONS,
} from "../action-tool-panels";

export function registerHostOverlayPanels(editor: Editor) {
  editor.overlayPanels.register({
    id: "canvas-search",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/CanvasSearch.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 10,
    toggleEvent: getPanelToggleEvent("canvas-search"),
  });

  editor.overlayPanels.register({
    id: "history-panel",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/HistoryPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 20,
    toggleEvent: getPanelToggleEvent("history-panel"),
  });

  editor.overlayPanels.register({
    id: "plugin-market",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(
      () => import("@/components/PluginMarket/PluginMarketDrawer.vue"),
    ),
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 30,
    toggleEvent: getPanelToggleEvent("plugin-market"),
  });

  editor.overlayPanels.register({
    id: "shortcut-help",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/ShortcutHelp.vue")),
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 35,
    toggleEvent: getPanelToggleEvent("shortcut-help"),
  });

  editor.overlayPanels.register({
    id: "drawing-settings",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/DrawingSettingsPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: false,
    order: 36,
    toggleEvent: getPanelToggleEvent("drawing-settings"),
  });

  editor.overlayPanels.register({
    id: "template-market",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(
      () => import("@/components/TemplateMarket/TemplateMarketDrawer.vue"),
    ),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 37,
    toggleEvent: getPanelToggleEvent("template-market"),
  });

  editor.overlayPanels.register({
    id: "align-panel",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 40,
    toggleEvent: getPanelToggleEvent("align-panel"),
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
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/ConnectorPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 39,
    toggleEvent: getPanelToggleEvent("connector-panel"),
  });

  editor.overlayPanels.register({
    id: "layer-tools-panel",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 41,
    toggleEvent: getPanelToggleEvent("layer-tools-panel"),
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
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/ActionToolPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 42,
    toggleEvent: getPanelToggleEvent("export-panel"),
    props: {
      panelId: "export-panel",
      title: "导出",
      icon: "export",
      layout: "list",
      sections: EXPORT_PANEL_SECTIONS,
    },
  });
}
