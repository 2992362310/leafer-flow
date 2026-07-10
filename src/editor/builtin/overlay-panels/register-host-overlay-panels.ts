import { defineAsyncComponent } from "vue";
import type Editor from "@/editor/editor";
import { BUILTIN_PLUGIN_ID } from "../../constants";

export function registerHostOverlayPanels(editor: Editor) {
  editor.overlayPanels.register({
    id: "canvas-search",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/CanvasSearch.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 10,
    toggleEvent: "leafer-flow:toggle-search",
  });

  editor.overlayPanels.register({
    id: "history-panel",
    pluginId: BUILTIN_PLUGIN_ID,
    component: defineAsyncComponent(() => import("@/components/HistoryPanel.vue")),
    visibilityMode: "open-prop",
    needsEditor: true,
    order: 20,
    toggleEvent: "leafer-flow:toggle-history",
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
    toggleEvent: "leafer-flow:toggle-plugin-market",
  });
}
