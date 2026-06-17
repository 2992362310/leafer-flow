import type { Ruler } from "leafer-x-ruler";
import type { EditorPluginModule } from "../../../api/plugin";
import type Editor from "../../../editor";
import { editorRuler } from "../../../plugins/ruler";

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
    const ruler = ctx.editor.use<Ruler>(editorRuler);
    instances.set(ctx.editor, ruler);
  },
  deactivate(ctx) {
    instances.get(ctx.editor)?.dispose();
    instances.delete(ctx.editor);
  },
};
