import type Editor from "../editor";

export type ViewAction = "fit" | "center" | "zoomIn" | "zoomOut" | "reset";

export function doViewAction(
  editor: Editor,
  action: ViewAction,
): { success: boolean; message: string } {
  if (editor.app.tree.children.length === 0) {
    return { success: false, message: "画布为空，暂无可定位内容" };
  }

  if (action === "fit") {
    editor.app.zoom("fit", { padding: [96, 96, 96, 96] });
    return { success: true, message: "已适应全部内容" };
  }

  if (action === "center") {
    editor.app.zoom(editor.app.tree.children, { padding: [96, 96, 96, 96], scroll: true });
    return { success: true, message: "已居中显示内容" };
  }

  if (action === "zoomIn") {
    editor.app.zoom("in");
    return { success: true, message: "已放大画布" };
  }

  if (action === "zoomOut") {
    editor.app.zoom("out");
    return { success: true, message: "已缩小画布" };
  }

  editor.app.zoom(1);
  return { success: true, message: "已恢复 100% 缩放" };
}

export function getZoomPercent(editor?: Editor): number {
  const scale = editor?.app.tree.scaleX || 1;
  return Math.round(scale * 100);
}
