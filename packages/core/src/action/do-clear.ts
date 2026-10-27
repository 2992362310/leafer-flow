import type Editor from "../editor";

/**
 * 清空画布操作
 * @param editor 编辑器实例
 * @returns 执行结果
 */
export function doClear(editor: Editor): { success: boolean; message: string } {
  try {
    editor.documentCommands.clear();

    return {
      success: true,
      message: "画布已清空",
    };
  } catch (error) {
    console.error("清空画布时发生错误:", error);

    return {
      success: false,
      message: "清空画布失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
