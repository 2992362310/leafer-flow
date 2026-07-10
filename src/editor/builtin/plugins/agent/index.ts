import { defineAsyncComponent } from "vue";
import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.agent";

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
    capabilities: ["command", "action-button", "overlay-panel"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["打开 AI 助手"],
    buttons: ["AI 助手"],
    overlayPanels: ["AI 助手"],
  },
  activate(ctx) {
    ctx.editor.overlayPanels.register({
      id: "agent-chat",
      pluginId: PLUGIN_ID,
      component: defineAsyncComponent(() => import("./AgentChatPanel.vue")),
      visibilityMode: "self-visible",
      needsEditor: true,
      order: 40,
      toggleEvent: "leafer-flow:toggle-agent",
    });

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
