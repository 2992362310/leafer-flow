import type { IUI } from "leafer";
import type Editor from "../editor";
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

  const tree = editor.app.tree;
  const scale = tree.scaleX || 1;
  const point = { x: (x - (tree.x ?? 0)) / scale, y: (y - (tree.y ?? 0)) / scale };
  editor.documentCommands.addConnectorWaypoint(editor.renderer.getId(connector), point);
  return { success: true, message: "已添加中间点" };
}

export function doRemoveConnectorWaypoints(
  editor: Editor,
): { success: boolean; message: string } {
  const connector = findSelectedConnector(editor.app.editor.list as IUI[]);
  if (!connector) {
    return { success: false, message: "请先选择一条连接线" };
  }

  const edge = editor.document.snapshot().edges.find((item) => item.id === editor.renderer.getId(connector));
  const waypoints = Array.isArray(edge?.data.waypoints) ? edge.data.waypoints : [];
  if (!waypoints.length) {
    return { success: false, message: "该连接线没有中间点" };
  }

  const count = editor.documentCommands.removeConnectorWaypoints(editor.renderer.getId(connector));
  return { success: true, message: `已移除 ${count} 个中间点` };
}
