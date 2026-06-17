import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.minimap";

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
    // 注册切换缩略图命令
    ctx.editor.commands.register({
      id: "toggleMinimap",
      label: "切换缩略图",
      pluginId: PLUGIN_ID,
      run: () => {
        // 通过自定义事件通知 App.vue 切换缩略图
        window.dispatchEvent(new CustomEvent("leafer-flow:toggle-minimap"));
        return { success: true, message: "已切换缩略图" };
      },
    });

    // 注册操作按钮
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
