import Editor from "./editor";
import { registerDefaultCommands } from "./builtin/commands/default-commands";
import { builtinPlugins } from "./builtin/plugins";
import { getEnabledPluginIds } from "./plugins/market/builtin-registry";

import { doAlign } from "./action/do-align";
import { doClear } from "./action/do-clear";
import { doCopy, doPaste } from "./action/do-clipboard";
import { doAddConnectorLabel } from "./action/do-connector-label";
import { doConnectorToFront } from "./action/do-connector-layer";
import { doDelete } from "./action/do-delete";
import { doExportPNG, doExportSVG, doLoad, doSave } from "./action/do-file";
import { doGroup } from "./action/do-group";
import { doLayer, doToggleLock, doToggleVisible } from "./action/do-layer";
import { doNudge } from "./action/do-nudge";
import { doRedo } from "./action/do-redo";
import { doSelectAll } from "./action/do-select-all";
import { doInsertTemplate } from "./action/do-template";
import { doUndo } from "./action/do-undo";
import { doUnGroup } from "./action/do-ungroup";
import { doViewAction, getZoomPercent } from "./action/do-view";
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
} from "./core/drawing-settings";
import { applyStylePreset, stylePresets } from "./core/style-presets";

export function initEditor(view: HTMLElement) {
  const editor = new Editor({
    view,
    editor: {},
    tree: { type: "design" },
  });

  registerDefaultCommands(editor);
  activateEnabledPlugins(editor);

  return editor;
}

function activateEnabledPlugins(editor: Editor) {
  const enabledIds = new Set(getEnabledPluginIds());
  builtinPlugins.forEach((plugin) => {
    if (enabledIds.has(plugin.manifest.id)) {
      void editor.pluginManager.activate(plugin);
    }
  });
}

export {
  Editor,
  doAddConnectorLabel,
  doAlign,
  doClear,
  doConnectorToFront,
  doCopy,
  doDelete,
  doExportPNG,
  doExportSVG,
  doGroup,
  doInsertTemplate,
  doLayer,
  doLoad,
  doNudge,
  doPaste,
  doRedo,
  doSave,
  doSelectAll,
  doToggleLock,
  doToggleVisible,
  doUndo,
  doUnGroup,
  doViewAction,
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  getZoomPercent,
  applyStylePreset,
  stylePresets,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
};
