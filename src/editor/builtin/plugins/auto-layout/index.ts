import type { EditorPluginModule } from "../../../api/plugin";
import type Editor from "../../../editor";
import { autoLayout, LAYOUT_PRESETS, type LayoutOptions } from "./layout-engine";
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

  const result = autoLayout([...selected] as any[], direction ? { direction } : undefined);
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
    version: "1.0.0",
    description: "根据连接关系自动排列节点位置",
    category: "layout",
    capabilities: ["command", "action-button"],
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
    buttons: ["自动布局"],
  },
  activate(ctx) {
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
      label: "智能布局 Pro",
      icon: "template",
      pluginId: PLUGIN_ID,
      kind: "dropdown",
      order: 65,
      items: [
        {
          id: "auto-layout-selection",
          label: "选区自动布局",
          command: "autoLayoutSelection",
          icon: "template",
          order: 5,
        },
        {
          id: "auto-layout-global",
          label: "全图自动布局",
          command: "autoLayoutGlobal",
          icon: "template",
          order: 10,
        },
        {
          id: "auto-layout-selection-tb",
          label: "选区: 从上到下",
          command: "autoLayoutSelectionTB",
          icon: "template",
          order: 20,
        },
        {
          id: "auto-layout-selection-lr",
          label: "选区: 从左到右",
          command: "autoLayoutSelectionLR",
          icon: "template",
          order: 30,
        },
        {
          id: "auto-layout-selection-bt",
          label: "选区: 从下到上",
          command: "autoLayoutSelectionBT",
          icon: "template",
          order: 35,
        },
        {
          id: "auto-layout-selection-rl",
          label: "选区: 从右到左",
          command: "autoLayoutSelectionRL",
          icon: "template",
          order: 37,
        },
        {
          id: "auto-layout-global-tb",
          label: "全图: 从上到下",
          command: "autoLayoutGlobalTB",
          icon: "template",
          order: 40,
        },
        {
          id: "auto-layout-global-lr",
          label: "全图: 从左到右",
          command: "autoLayoutGlobalLR",
          icon: "template",
          order: 50,
        },
        {
          id: "auto-layout-global-bt",
          label: "全图: 从下到上",
          command: "autoLayoutGlobalBT",
          icon: "template",
          order: 55,
        },
        {
          id: "auto-layout-global-rl",
          label: "全图: 从右到左",
          command: "autoLayoutGlobalRL",
          icon: "template",
          order: 57,
        },
      ],
    });
  },
};
