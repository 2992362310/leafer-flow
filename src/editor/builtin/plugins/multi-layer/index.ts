import type { EditorPluginModule } from "../../../api/plugin";

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
    capabilities: ["command", "action-button"],
    enabledByDefault: false,
    configurable: true,
  },
  contributes: {
    commands: ["切换图层面板"],
    buttons: ["图层"],
  },
  activate(ctx) {
    const config = getConfig(ctx);

    ctx.editor.commands.register({
      id: "toggleLayerPanel",
      label: "切换图层面板",
      pluginId: PLUGIN_ID,
      run: () => {
        window.dispatchEvent(
          new CustomEvent("leafer-flow:toggle-layer-panel", { detail: config }),
        );
        return { success: true, message: "已切换图层面板" };
      },
    });

    ctx.editor.actionButtons.register({
      id: "multi-layer",
      label: "图层",
      icon: "layer",
      pluginId: PLUGIN_ID,
      kind: "button",
      order: 77,
      items: [
        {
          id: "toggle-layer-panel",
          label: "图层面板",
          command: "toggleLayerPanel",
          icon: "layer",
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
