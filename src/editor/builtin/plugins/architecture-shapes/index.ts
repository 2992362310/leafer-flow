import type { EditorPluginModule } from "../../../api/plugin";
import { toolDefinitions } from "../../../tool-definitions";
import { createToolContribution } from "../../tools/create-tool-contribution";
import { listToolLabelsByLibraryGroup } from "../../tools/tool-preview";

const PLUGIN_ID = "leafer-flow.architecture-shapes";

export const architectureShapesPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "架构图节点",
    version: "1.0.0",
    description: "提供架构图、部署图和系统设计常用节点。",
    category: "shape",
    capabilities: ["tool"],
    enabledByDefault: true,
  },
  contributes: {
    tools: listToolLabelsByLibraryGroup("architecture"),
  },
  activate(ctx) {
    toolDefinitions
      .filter((definition) => definition.library?.groupId === "architecture")
      .forEach((definition, index) => {
        ctx.editor.registerTool(createToolContribution(definition, PLUGIN_ID, 300 + index));
      });
  },
};
