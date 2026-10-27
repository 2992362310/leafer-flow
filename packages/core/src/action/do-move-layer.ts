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

  try {
    editor.documentCommands.placeElement(
      editor.renderer.getId(dragNode), editor.renderer.getId(dropNode),
      payload.dropPosition === "top" ? "after" : payload.dropPosition === "bottom" ? "before" : "inside",
    );
    return { success: true, message: "图层顺序已更新" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "图层移动失败" };
  }
}

function findNode(root: IUI, id: number): IUI | null {
  if (root.innerId === id) return root;

  for (const child of root.children ?? []) {
    const result = findNode(child as IUI, id);
    if (result) return result;
  }

  return null;
}
