import type { IUI } from "@leafer-ui/interface";
import type Editor from "../editor";

export interface MoveLayerPayload {
  dragId: number;
  dropId: number;
  dropPosition: "top" | "bottom" | "inside";
}

export function doMoveLayer(
  editor: Editor,
  payload?: MoveLayerPayload,
): { success: boolean; message: string } {
  if (!payload) return { success: false, message: "缺少图层移动参数" };

  const root = editor.app.tree as IUI;
  const dragNode = findNode(root, payload.dragId);
  const dropNode = findNode(root, payload.dropId);

  if (!dragNode || !dropNode) {
    return { success: false, message: "未找到图层节点" };
  }

  if (dragNode === dropNode) {
    return { success: false, message: "不能移动到自身" };
  }

  if (isAncestor(dragNode, dropNode)) {
    return { success: false, message: "不能移动到自身子级" };
  }

  if (payload.dropPosition === "top") {
    if (!dropNode.parent) return { success: false, message: "目标图层没有父级" };
    dropNode.parent.addAfter(dragNode, dropNode);
  } else if (payload.dropPosition === "bottom") {
    if (!dropNode.parent) return { success: false, message: "目标图层没有父级" };
    dropNode.parent.addBefore(dragNode, dropNode);
  } else {
    dropNode.add(dragNode);
  }

  editor.commitMutation();
  return { success: true, message: "图层顺序已更新" };
}

function findNode(root: IUI, id: number): IUI | null {
  if (root.innerId === id) return root;

  for (const child of root.children ?? []) {
    const result = findNode(child as IUI, id);
    if (result) return result;
  }

  return null;
}

function isAncestor(candidate: IUI, node: IUI) {
  let parent = node.parent;
  while (parent) {
    if (parent === candidate) return true;
    parent = parent.parent;
  }
  return false;
}
