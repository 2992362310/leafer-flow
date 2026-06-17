import type { EditorPluginModule } from "../../../api/plugin";
import { autoLayout, LAYOUT_PRESETS, type LayoutOptions } from "./layout-engine";

const PLUGIN_ID = "leafer-flow.auto-layout";

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
    commands: ["自动布局", "从上到下布局", "从左到右布局"],
    buttons: ["自动布局"],
  },
  activate(ctx) {
    // 注册自动布局命令
    ctx.editor.commands.register({
      id: "autoLayout",
      label: "自动布局",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return {
            success: false,
            message: "请先选中要布局的元素",
          };
        }

        const result = autoLayout([...selected] as any[]);
        if (result.success) {
          editor.commitMutation({ syncConnectorLabels: true });
        }
        return result;
      },
    });

    // 注册从上到下布局命令
    ctx.editor.commands.register({
      id: "autoLayoutTB",
      label: "从上到下布局",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return {
            success: false,
            message: "请先选中要布局的元素",
          };
        }

        const result = autoLayout([...selected] as any[], { direction: "TB" });
        if (result.success) {
          editor.commitMutation({ syncConnectorLabels: true });
        }
        return result;
      },
    });

    // 注册从左到右布局命令
    ctx.editor.commands.register({
      id: "autoLayoutLR",
      label: "从左到右布局",
      pluginId: PLUGIN_ID,
      run: (editor) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return {
            success: false,
            message: "请先选中要布局的元素",
          };
        }

        const result = autoLayout([...selected] as any[], { direction: "LR" });
        if (result.success) {
          editor.commitMutation({ syncConnectorLabels: true });
        }
        return result;
      },
    });

    // 注册操作按钮
    ctx.editor.actionButtons.register({
      id: "auto-layout",
      label: "自动布局",
      icon: "template",
      pluginId: PLUGIN_ID,
      kind: "dropdown",
      order: 65,
      items: [
        {
          id: "auto-layout-tb",
          label: "从上到下",
          command: "autoLayoutTB",
          icon: "template",
          order: 10,
        },
        {
          id: "auto-layout-lr",
          label: "从左到右",
          command: "autoLayoutLR",
          icon: "template",
          order: 20,
        },
      ],
    });
  },
};
