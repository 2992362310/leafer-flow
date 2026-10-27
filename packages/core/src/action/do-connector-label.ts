import type { IUI } from "leafer";
import type Editor from "../editor";
import type { CommandResult } from "../api/command";
import { findSelectedConnector } from "../core/connector-labels";

export function doAddConnectorLabel(editor: Editor): CommandResult {
  const connector = findSelectedConnector(editor.app.editor.list as IUI[]);
  if (!connector) {
    return { success: false, message: "请先选中一条连接线，再添加标签", warning: true };
  }

  const edgeId = editor.renderer.getId(connector);
  const labelId = editor.documentCommands.addConnectorLabel(edgeId);
  const label = editor.renderer.getNode(labelId);
  if (label) editor.app.editor.select(label);

  return { success: true, message: "已添加连线标签" };
}
