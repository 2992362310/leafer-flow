import { defineAsyncComponent } from "vue";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import { dispatchPanelToggle } from "@leafer-flow/core/api/panel-toggle";

const PLUGIN_ID = "leafer-flow.minimap";

export const minimapPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "缩略图导航",
    version: "1.0.0",
    description: "显示画布缩略图，支持点击导航",
    category: "view",
    capabilities: ["command", "action-button", "overlay-panel"],
    enabledByDefault: true,
  },
  contributes: {
    commands: ["切换缩略图"],
    buttons: ["缩略图"],
    overlayPanels: ["缩略图"],
  },
  activate(ctx) {
    ctx.editor.overlayPanels.register({
      id: "minimap-panel",
      label: "缩略图",
      icon: "map",
      pluginId: PLUGIN_ID,
      component: defineAsyncComponent(() => import("./MinimapPanel.vue")),
      visibilityMode: "self-visible",
      needsEditor: true,
      order: 50,
    });

    ctx.editor.commands.register({
      id: "toggleMinimap",
      label: "切换缩略图",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        dispatchPanelToggle(editor, "minimap-panel");
        return { success: true, message: "已执行" };
      },
    });

    ctx.editor.actionButtons.register({
      id: "minimap",
      label: "缩略图",
      icon: "map",
      pluginId: PLUGIN_ID,
      kind: "button",
      surface: "panel",
      order: 30,
      items: [
        {
          id: "toggle-minimap",
          label: "切换缩略图",
          command: "toggleMinimap",
          icon: "map",
          panelId: "minimap-panel",
          order: 10,
        },
      ],
    });
  },
};
