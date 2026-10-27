import type Editor from "../editor";

export function doConnectorToFront(editor: Editor): { success: boolean; message: string } {
  try {
    const document = editor.document.snapshot();
    if (!document.nodes.length && !document.edges.length) {
      return { success: false, message: "画布为空" };
    }

    const connectors = document.edges.filter((edge) => edge.parentId === null);

    if (!connectors.length) {
      return { success: false, message: "画布上没有连接线" };
    }

    editor.documentCommands.reorderElements(connectors.map((edge) => edge.id), "bringToFront");
    return { success: true, message: `已将 ${connectors.length} 条连接线置于顶层` };
  } catch (error) {
    console.error("连接线置顶失败", error);
    return {
      success: false,
      message: "连接线置顶失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
