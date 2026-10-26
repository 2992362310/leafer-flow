import { defineAsyncComponent } from "vue";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import type Editor from "@leafer-flow/core/editor";
import { dispatchPanelToggle, getPanelToggleEvent } from "@leafer-flow/core/api/panel-toggle";
import { autoLayout } from "./layout-engine";
import type { IUI } from "leafer";

const PLUGIN_ID = "leafer-flow.auto-layout";

function collectAllLayoutElements(editor: Editor): IUI[] {
  const treeChildren = (editor.app.tree.children ?? []) as IUI[];
  return treeChildren.filter((item) => item.visible !== false);
}

function runSelectionAutoLayout(editor: Editor, direction?: "TB" | "LR" | "BT" | "RL") {
  const selected = editor.app.editor.list;
  if (!selected || selected.length === 0) {
    return { success: false, message: "请先选中要布局的元素" };
  }

  const result = autoLayout([...selected] as IUI[], direction ? { direction } : undefined);
  if (result.success) {
    editor.commitMutation({ syncConnectorLabels: true });
  }
  return result;
}

function runGlobalAutoLayout(editor: Editor, direction?: "TB" | "LR" | "BT" | "RL") {
  const elements = collectAllLayoutElements(editor);
  const result = autoLayout(elements, direction ? { direction } : undefined);
  if (result.success) {
    editor.commitMutation({ syncConnectorLabels: true });
  }
  return result;
}

export const autoLayoutPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "自动布局",
    version: "1.2.0",
    description: "根据连接关系自动排列节点位置",
    category: "layout",
    capabilities: ["command", "action-button", "overlay-panel"],
    enabledByDefault: true,
  },
  contributes: {
    commands: [
      "选区自动布局",
      "全图自动布局",
      "选区从上到下布局",
      "选区从左到右布局",
      "选区从下到上布局",
      "选区从右到左布局",
      "全图从上到下布局",
      "全图从左到右布局",
      "全图从下到上布局",
      "全图从右到左布局",
    ],
    buttons: ["智能布局"],
    overlayPanels: ["智能布局"],
  },
  activate(ctx) {
    ctx.editor.overlayPanels.register({
      id: "auto-layout-panel",
      pluginId: PLUGIN_ID,
      component: defineAsyncComponent(() => import("../../../components/AutoLayoutPanel.vue")),
      visibilityMode: "open-prop",
      needsEditor: true,
      order: 65,
      toggleEvent: getPanelToggleEvent("auto-layout-panel"),
    });

    ctx.editor.commands.register({
      id: "toggleAutoLayoutPanel",
      label: "智能布局",
      pluginId: PLUGIN_ID,
      run: () => {
        dispatchPanelToggle("auto-layout-panel");
        return { success: true, message: "已切换智能布局" };
      },
    });

    ctx.editor.commands.register({
      id: "autoLayoutSelection",
      label: "选区自动布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runSelectionAutoLayout(editor),
    });

    ctx.editor.commands.register({
      id: "autoLayoutGlobal",
      label: "全图自动布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runGlobalAutoLayout(editor),
    });

    ctx.editor.commands.register({
      id: "autoLayoutSelectionTB",
      label: "选区从上到下布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runSelectionAutoLayout(editor, "TB"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutSelectionLR",
      label: "选区从左到右布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runSelectionAutoLayout(editor, "LR"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutSelectionBT",
      label: "选区从下到上布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runSelectionAutoLayout(editor, "BT"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutSelectionRL",
      label: "选区从右到左布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runSelectionAutoLayout(editor, "RL"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutGlobalTB",
      label: "全图从上到下布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runGlobalAutoLayout(editor, "TB"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutGlobalLR",
      label: "全图从左到右布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runGlobalAutoLayout(editor, "LR"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutGlobalBT",
      label: "全图从下到上布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runGlobalAutoLayout(editor, "BT"),
    });

    ctx.editor.commands.register({
      id: "autoLayoutGlobalRL",
      label: "全图从右到左布局",
      pluginId: PLUGIN_ID,
      run: (editor) => runGlobalAutoLayout(editor, "RL"),
    });

    ctx.editor.actionButtons.register({
      id: "auto-layout",
      label: "智能布局",
      icon: "distribute_vertical",
      pluginId: PLUGIN_ID,
      kind: "button",
      surface: "arrange",
      order: 30,
      items: [
        {
          id: "toggle-auto-layout-panel",
          label: "智能布局",
          command: "toggleAutoLayoutPanel",
          icon: "distribute_vertical",
          panelId: "auto-layout-panel",
        },
      ],
    });
  },
};
