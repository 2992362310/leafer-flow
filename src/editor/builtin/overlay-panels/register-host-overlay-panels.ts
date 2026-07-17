import { defineAsyncComponent } from "vue";
import type Editor from "@/editor/editor";
import { BUILTIN_PLUGIN_ID } from "../../constants";
import { getPanelToggleEvent } from "../../api/panel-toggle";

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
}
