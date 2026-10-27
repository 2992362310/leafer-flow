import type Editor from "../editor";

export function doNudge(
  editor: Editor,
  dx: number,
  dy: number,
): { success: boolean; message: string } {
  try {
    const list = editor.app.editor.list ?? [];
    if (!list.length) {
      return { success: false, message: "未选中元素" };
    }

    const moved = editor.documentCommands.moveElements(list.map((item) => editor.renderer.getId(item)), dx, dy);

    if (!moved) {
      return { success: false, message: "选中元素不可移动" };
    }

    return { success: true, message: `已移动 ${moved} 个元素` };
  } catch (error) {
    console.error("执行移动操作时发生错误", error);
    return {
      success: false,
      message: "移动操作失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
