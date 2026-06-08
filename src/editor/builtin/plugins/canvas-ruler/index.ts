import type { Ruler } from "leafer-x-ruler";
import type { EditorPluginModule } from "../../../api/plugin";
import { editorRuler } from "../../../plugins/ruler";

let ruler: Ruler | undefined;

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
  activate(ctx) {
    ruler = ctx.editor.use<Ruler>(editorRuler);
  },
  deactivate() {
    ruler?.dispose();
    ruler = undefined;
  },
};
