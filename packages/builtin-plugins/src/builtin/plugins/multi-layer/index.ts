import { defineAsyncComponent } from "vue";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { dispatchPanelToggle } from "@leafer-flow/core/api/panel-toggle";

const PLUGIN_ID = "leafer-flow.multi-layer";

const DEFAULT_CONFIG = {
  defaultLayerCount: 3,
  showOpacityControl: true,
};

function getConfig(ctx: { storage: { get: <T>(key: string) => T | null } }) {
  return {
    defaultLayerCount: ctx.storage.get<number>("defaultLayerCount") ?? DEFAULT_CONFIG.defaultLayerCount,
    showOpacityControl: ctx.storage.get<boolean>("showOpacityControl") ?? DEFAULT_CONFIG.showOpacityControl,
  };
}

export const multiLayerPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "多层画布",
    version: "1.0.0",
    description: "支持多个图层，可独立控制显示、锁定和透明度",
    category: "utility",
    capabilities: ["command", "action-button", "overlay-panel"],
    enabledByDefault: false,
    configurable: true,
  },
  contributes: {
    commands: ["切换多图层"],
    buttons: ["多图层"],
    overlayPanels: ["多图层"],
  },
  activate(ctx) {
    const config = getConfig(ctx);

    ctx.editor.overlayPanels.register({
      id: "multi-layer-panel",
      label: "多图层",
      icon: "ungroup",
      pluginId: PLUGIN_ID,
      component: defineAsyncComponent(() => import("./LayerPanel.vue")),
      visibilityMode: "self-visible",
      needsEditor: true,
      order: 60,
    });

    ctx.editor.commands.register({
      id: "toggleMultiLayerPanel",
      label: "切换多图层",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        dispatchPanelToggle(editor, "multi-layer-panel", config);
        return { success: true, message: "已切换多图层面板" };
      },
    });

    ctx.editor.actionButtons.register({
      id: "multi-layer",
      label: "多图层",
      icon: "layer",
      pluginId: PLUGIN_ID,
      kind: "button",
      surface: "panel",
      order: 40,
      items: [
        {
          id: "toggle-multi-layer-panel",
          label: "多图层面板",
          command: "toggleMultiLayerPanel",
          icon: "layer",
          panelId: "multi-layer-panel",
          order: 10,
        },
      ],
    });
  },
  configure() {
    return {
      fields: [
        {
          key: "defaultLayerCount",
          label: "默认图层数量",
          type: "number" as const,
          default: DEFAULT_CONFIG.defaultLayerCount,
          min: 1,
          max: 10,
          step: 1,
        },
        {
          key: "showOpacityControl",
          label: "显示透明度控制",
          type: "boolean" as const,
          default: DEFAULT_CONFIG.showOpacityControl,
        },
      ],
    };
  },
};
