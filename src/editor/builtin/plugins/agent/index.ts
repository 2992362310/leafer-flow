import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.agent";

/**
 * 通过 CustomEvent 与 Vue 层通信。
 * 这是一种松耦合模式：编辑器核心不依赖 Vue 组件树，
 * Vue 层通过 addEventListener 监听这些事件来响应命令。
 * 注意：命令始终返回 success，因为无法同步获知 Vue 层是否已响应。
 */
function dispatchToggle(eventName: string) {
  window.dispatchEvent(new CustomEvent(eventName));
  return { success: true, message: "已执行" };
}

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
    ctx.editor.commands.register({
      id: "openAgent",
      label: "打开 AI 助手",
      pluginId: PLUGIN_ID,
      run: () => dispatchToggle("leafer-flow:toggle-agent"),
    });

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
