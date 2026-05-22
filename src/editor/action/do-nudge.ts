import type { IUI } from "leafer";
import type Editor from "../editor";

export function doNudge(
  editor: Editor,
  dx: number,
  dy: number,
): { success: boolean; message: string } {
  try {
    const list = (editor.app.editor.list || []) as IUI[];
    if (!list.length) {
      return { success: false, message: "未选中元素" };
    }

    let moved = 0;
    list.forEach((item) => {
      if ((item as { locked?: boolean }).locked) return;
      item.x = (item.x || 0) + dx;
      item.y = (item.y || 0) + dy;
      moved += 1;
    });

    if (!moved) {
      return { success: false, message: "选中元素不可移动" };
    }

    editor.history.save();
    return { success: true, message: `已移动 ${moved} 个元素` };
  } catch (error) {
    console.error("执行移动操作时发生错误", error);
    return {
      success: false,
      message: "移动操作失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
