import type Editor from "../editor";

export function doDelete(editor: Editor): { success: boolean; message: string } {
  try {
    const list = editor.app.editor.list ?? [];
    if (!list.length) {
      return {
        success: false,
        message: "未选择元素",
      };
    }

    const count = editor.documentCommands.remove(list.map((element) => editor.renderer.getId(element)));

    return {
      success: true,
      message: `已删除 ${count} 个元素`,
    };
  } catch (error) {
    console.error("执行删除操作时发生错误", error);
    return {
      success: false,
      message: "删除操作失败",
    };
  }
}
