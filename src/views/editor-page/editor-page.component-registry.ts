import { defineAsyncComponent } from "vue";

export const editorPageComponentRegistry = {
    CanvasSearch: defineAsyncComponent(() => import("@/components/CanvasSearch.vue")),
    HistoryPanel: defineAsyncComponent(() => import("@/components/HistoryPanel.vue")),
    ShortcutHelp: defineAsyncComponent(() => import("@/components/ShortcutHelp.vue")),
    PluginMarketDrawer: defineAsyncComponent(
        () => import("@/components/PluginMarket/PluginMarketDrawer.vue"),
    ),
    AgentChatPanel: defineAsyncComponent(
        () => import("@/editor/builtin/plugins/agent/AgentChatPanel.vue"),
    ),
    MinimapPanel: defineAsyncComponent(
        () => import("@/editor/builtin/plugins/minimap/MinimapPanel.vue"),
    ),
    MultiLayerPanel: defineAsyncComponent(
        () => import("@/editor/builtin/plugins/multi-layer/LayerPanel.vue"),
    ),
    DiagramLintPanel: defineAsyncComponent(
        () => import("@/editor/builtin/plugins/diagram-lint/DiagramLintPanel.vue"),
    ),
};
