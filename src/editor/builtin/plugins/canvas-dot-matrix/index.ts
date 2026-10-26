import { DotMatrix } from "leafer-x-dot-matrix";
import type { EditorPluginModule } from "../../../api/plugin";
import type Editor from "../../../editor";

const instances = new WeakMap<Editor, DotMatrix>();

export const canvasDotMatrixPlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.canvas-dot-matrix",
    name: "点阵背景",
    version: "1.0.0",
    description: "提供画布点阵背景辅助线。",
    category: "utility",
    capabilities: ["canvas-overlay"],
    enabledByDefault: true,
  },
  contributes: {
    canvasOverlays: ["点阵背景"],
  },
  activate(ctx) {
    const dotMatrix = new DotMatrix(ctx.editor.app);
    dotMatrix.enableDotMatrix(true);
    instances.set(ctx.editor, dotMatrix);
  },
  deactivate(ctx) {
    instances.get(ctx.editor)?.destroy();
    instances.delete(ctx.editor);
  },
};
