import type { IUI } from "leafer";
import type Editor from "../editor";
import { createConnectorLabel, findSelectedConnector, syncConnectorLabels } from "../core/connector-labels";

export function doAddConnectorLabel(editor: Editor): { success: boolean; message: string } {
  const connector = findSelectedConnector(editor.app.editor.list as IUI[]);
  if (!connector) {
    return { success: false, message: "请先选择一条连接线" };
  }

  const label = createConnectorLabel(connector);
  editor.app.tree.add(label);
  syncConnectorLabels(editor.app);
  editor.app.editor.select(label);
  editor.history.save();

  return { success: true, message: "已添加连线标签" };
}
