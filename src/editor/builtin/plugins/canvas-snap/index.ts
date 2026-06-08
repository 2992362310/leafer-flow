import type { Snap } from "leafer-x-easy-snap";
import type { EditorPluginModule } from "../../../api/plugin";
import { editorSnap } from "../../../plugins/snap";

export const canvasSnapPlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.canvas-snap",
    name: "智能吸附",
    version: "1.0.0",
    description: "提供画布元素移动时的辅助吸附。",
    category: "utility",
    capabilities: ["canvas-overlay"],
    enabledByDefault: true,
  },
  activate(ctx) {
    ctx.editor.snap = ctx.editor.use<Snap>(editorSnap);
  },
  deactivate(ctx) {
    ctx.editor.snap?.destroy();
    ctx.editor.snap = undefined;
  },
};
