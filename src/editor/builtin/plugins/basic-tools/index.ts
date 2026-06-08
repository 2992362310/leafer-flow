import type { EditorPluginModule } from "../../../api/plugin";
import { toolDefinitions } from "../../../tool-definitions";
import { createToolContribution } from "../../tools/create-tool-contribution";
import { listBasicToolLabels } from "../../tools/tool-preview";

const PLUGIN_ID = "leafer-flow.basic-tools";

export const basicToolsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "基础绘制工具",
    version: "1.0.0",
    description: "提供选择外的基础绘制工具，如矩形、圆形、文本、连接线和自由绘制。",
    category: "tool",
    capabilities: ["tool"],
    enabledByDefault: true,
  },
  contributes: {
    tools: listBasicToolLabels(),
  },
  activate(ctx) {
    toolDefinitions
      .filter((definition) => definition.library?.groupId === "basic" || !definition.library)
      .forEach((definition, index) => {
        ctx.editor.registerTool(createToolContribution(definition, PLUGIN_ID, index));
      });
  },
};
