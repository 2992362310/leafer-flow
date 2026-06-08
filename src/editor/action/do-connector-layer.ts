import type { IUI } from "leafer";
import { Connector } from "leafer-connector";
import type Editor from "../editor";

export function doConnectorToFront(editor: Editor): { success: boolean; message: string } {
  try {
    const children = editor.app.tree.children;
    if (!children?.length) {
      return { success: false, message: "画布为空" };
    }

    const connectors: IUI[] = [];
    for (const child of children) {
      if (child instanceof Connector) {
        connectors.push(child);
      }
    }

    if (!connectors.length) {
      return { success: false, message: "画布上没有连接线" };
    }

    connectors.forEach((connector) => {
      editor.app.tree.add(connector);
    });

    editor.commitMutation({ autoSave: false });
    return { success: true, message: `已将 ${connectors.length} 条连接线置于顶层` };
  } catch (error) {
    console.error("连接线置顶失败", error);
    return {
      success: false,
      message: "连接线置顶失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}
