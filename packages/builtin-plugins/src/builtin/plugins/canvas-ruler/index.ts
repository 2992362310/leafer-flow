import { Ruler } from "leafer-x-ruler";
import type { EditorPluginModule } from "@leafer-flow/core/api/plugin";
import type Editor from "@leafer-flow/core/editor";

const instances = new WeakMap<Editor, Ruler>();

export const canvasRulerPlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.canvas-ruler",
    name: "画布标尺",
    version: "1.0.0",
    description: "在画布上显示辅助标尺。",
    category: "utility",
    capabilities: ["canvas-overlay"],
    enabledByDefault: true,
  },
  contributes: {
    canvasOverlays: ["标尺"],
  },
  activate(ctx) {
    const ruler = new Ruler(ctx.editor.app);
    ruler.enabled = true;
    instances.set(ctx.editor, ruler);
  },
  deactivate(ctx) {
    instances.get(ctx.editor)?.dispose();
    instances.delete(ctx.editor);
  },
};
