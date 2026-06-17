import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.agent";

export const agentPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "AI 助手",
    version: "1.0.0",
    description: "通过自然语言指令快速编辑流程图",
    category: "utility",
    capabilities: ["command", "action-button"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["打开 AI 助手"],
    buttons: ["AI 助手"],
  },
  activate(ctx) {
    // 注册打开 AI 助手命令
    ctx.editor.commands.register({
      id: "openAgent",
      label: "打开 AI 助手",
      pluginId: PLUGIN_ID,
      run: () => {
        // 通过自定义事件通知 App.vue 打开面板
        window.dispatchEvent(new CustomEvent("leafer-flow:toggle-agent"));
        return { success: true, message: "已打开 AI 助手" };
      },
    });

    // 注册操作按钮
    ctx.editor.actionButtons.register({
      id: "agent",
      label: "AI 助手",
      icon: "agent",
      pluginId: PLUGIN_ID,
      kind: "button",
      order: 85,
      items: [
        {
          id: "open-agent",
          label: "AI 助手",
          command: "openAgent",
          icon: "agent",
          order: 10,
        },
      ],
    });
  },
};
