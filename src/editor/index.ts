import Editor from "./editor";
import { builtinPlugins } from "./builtin/plugins";
import { getEnabledPluginIds } from "./plugins/market/builtin-registry";
import { getZoomPercent } from "./action/do-view";

export function initEditor(view: HTMLElement) {
  const editor = new Editor({
    view,
    editor: {},
    tree: { type: "design" },
  });

  activateEnabledPlugins(editor);

  return editor;
}

function activateEnabledPlugins(editor: Editor) {
  const enabledIds = new Set(getEnabledPluginIds());
  builtinPlugins.forEach((plugin) => {
    if (plugin.manifest.required || enabledIds.has(plugin.manifest.id)) {
      void editor.pluginManager.activate(plugin);
    }
  });
}

export { Editor, getZoomPercent };
