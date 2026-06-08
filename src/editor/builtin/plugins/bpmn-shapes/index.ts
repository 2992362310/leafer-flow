import type { EditorPluginModule } from "../../../api/plugin";
import { toolDefinitions } from "../../../tool-definitions";
import { createToolContribution } from "../../tools/create-tool-contribution";
import { listToolLabelsByLibraryGroup } from "../../tools/tool-preview";

const PLUGIN_ID = "leafer-flow.bpmn-shapes";

export const bpmnShapesPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "BPMN 节点",
    version: "1.0.0",
    description: "提供 BPMN 常用事件、网关和任务节点。",
    category: "shape",
    capabilities: ["tool"],
    enabledByDefault: true,
  },
  contributes: {
    tools: listToolLabelsByLibraryGroup("bpmn"),
  },
  activate(ctx) {
    toolDefinitions
      .filter((definition) => definition.library?.groupId === "bpmn")
      .forEach((definition, index) => {
        ctx.editor.registerTool(createToolContribution(definition, PLUGIN_ID, 200 + index));
      });
  },
};
