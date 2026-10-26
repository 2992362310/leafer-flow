import type { IUI } from "leafer";
import type Editor from "../editor";

export function doSelectAll(editor: Editor): { success: boolean; message: string } {
  const children = (editor.app.tree.children || []) as IUI[];
  if (!children.length) {
    return { success: false, message: "画布为空" };
  }

  editor.app.editor.select(children);
  return { success: true, message: `已选择 ${children.length} 个元素` };
}
