import type { DotMatrix } from "leafer-x-dot-matrix";
import type { EditorPluginModule } from "../../../api/plugin";
import { editorDotMatrix } from "../../../plugins/dot-matrix";

let dotMatrix: DotMatrix | undefined;

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
  activate(ctx) {
    dotMatrix = ctx.editor.use<DotMatrix>(editorDotMatrix);
  },
  deactivate() {
    dotMatrix?.destroy();
    dotMatrix = undefined;
  },
};
