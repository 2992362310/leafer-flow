import type { EditorPluginModule } from "../../../api/plugin";
import { toolDefinitions } from "../../../tool-definitions";
import { createToolContribution } from "../../tools/create-tool-contribution";
import { listToolLabelsByLibraryGroup } from "../../tools/tool-preview";

const PLUGIN_ID = "leafer-flow.flow-shapes";

export const flowShapesPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "流程图节点",
    version: "1.0.0",
    description: "提供常用流程图节点。",
    category: "shape",
    capabilities: ["tool"],
    enabledByDefault: true,
  },
  contributes: {
    tools: listToolLabelsByLibraryGroup("flow"),
  },
  activate(ctx) {
    toolDefinitions
      .filter((definition) => definition.library?.groupId === "flow")
      .forEach((definition, index) => {
        ctx.editor.registerTool(createToolContribution(definition, PLUGIN_ID, 100 + index));
      });
  },
};
