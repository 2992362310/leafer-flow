import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.minimap";

function dispatchToggle(eventName: string) {
  window.dispatchEvent(new CustomEvent(eventName));
  return { success: true, message: "已执行" };
}

export const minimapPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "缩略图导航",
    version: "1.0.0",
    description: "显示画布缩略图，支持点击导航",
    category: "view",
    capabilities: ["command", "action-button"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["切换缩略图"],
    buttons: ["缩略图"],
  },
  activate(ctx) {
    ctx.editor.commands.register({
      id: "toggleMinimap",
      label: "切换缩略图",
      pluginId: PLUGIN_ID,
      run: () => dispatchToggle("leafer-flow:toggle-minimap"),
    });

    ctx.editor.actionButtons.register({
      id: "minimap",
      label: "缩略图",
      icon: "select",
      pluginId: PLUGIN_ID,
      kind: "button",
      order: 76,
      items: [
        {
          id: "toggle-minimap",
          label: "切换缩略图",
          command: "toggleMinimap",
          icon: "select",
          order: 10,
        },
      ],
    });
  },
};
