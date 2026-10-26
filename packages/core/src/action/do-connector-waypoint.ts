import type { IUI } from "leafer";
import type Editor from "../editor";
import { Connector } from "../core/connector";
import { findSelectedConnector } from "../core/connector-labels";

export function doAddConnectorWaypoint(
  editor: Editor,
  x: number,
  y: number,
): { success: boolean; message: string } {
  const connector = findSelectedConnector(editor.app.editor.list as IUI[]);
  if (!connector) {
    return { success: false, message: "请先选择一条连接线" };
  }

  // 将屏幕坐标转换为画布坐标
  const tree = editor.app.tree;
  const scale = tree.scaleX || 1;
  const canvasX = (x - tree.x) / scale;
  const canvasY = (y - tree.y) / scale;

  connector.addWaypoint({ x: canvasX, y: canvasY });
  editor.commitMutation({ syncConnectorLabels: true });
  return { success: true, message: "已添加中间点" };
}

export function doRemoveConnectorWaypoints(
  editor: Editor,
): { success: boolean; message: string } {
  const connector = findSelectedConnector(editor.app.editor.list as IUI[]);
  if (!connector) {
    return { success: false, message: "请先选择一条连接线" };
  }

  const waypoints = connector.getWaypoints();
  if (waypoints.length === 0) {
    return { success: false, message: "该连接线没有中间点" };
  }

  // 移除所有中间点（从后往前移除避免索引问题）
  for (let i = waypoints.length - 1; i >= 0; i--) {
    connector.removeWaypoint(i);
  }
  editor.commitMutation({ syncConnectorLabels: true });
  return { success: true, message: `已移除 ${waypoints.length} 个中间点` };
}
