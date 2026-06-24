import type { IUI } from "leafer";
import type Editor from "../editor";

export function doFlip(editor: Editor, axis: "x" | "y"): { success: boolean; message: string } {
  const selected = editor.app.editor.list as IUI[];
  if (!selected.length) {
    return { success: false, message: "请先选中要翻转的元素" };
  }

  selected.forEach((el) => {
    if (axis === "x") {
      el.scaleX = (el.scaleX || 1) * -1;
    } else {
      el.scaleY = (el.scaleY || 1) * -1;
    }
  });

  editor.commitMutation();
  const label = axis === "x" ? "水平" : "垂直";
  return { success: true, message: `已${label}翻转 ${selected.length} 个元素` };
}
