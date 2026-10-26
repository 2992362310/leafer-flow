import { Snap } from "leafer-x-easy-snap";
import type { EditorPluginModule } from "../../../api/plugin";
import { getSnapEnabled } from "../../../core/drawing-settings";

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
  contributes: {
    canvasOverlays: ["智能吸附"],
  },
  activate(ctx) {
    const snap = new Snap(ctx.editor.app);
    snap.enable(getSnapEnabled());
    ctx.editor.snap = snap;
  },
  deactivate(ctx) {
    ctx.editor.snap?.destroy();
    ctx.editor.snap = undefined;
  },
};
