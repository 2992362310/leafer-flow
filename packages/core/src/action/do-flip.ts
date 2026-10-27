import type Editor from "../editor";

export function doFlip(editor: Editor, axis: "x" | "y"): { success: boolean; message: string } {
  const selected = editor.app.editor.list ?? [];
  if (!selected.length) {
    return { success: false, message: "请先选中要翻转的元素" };
  }

  const patches = Object.fromEntries(selected.map((element) => {
    const id = editor.renderer.getId(element);
    const node = editor.document.getNode(id);
    const scale = axis === "x" ? Number(node?.data.scaleX ?? 1) : Number(node?.data.scaleY ?? 1);
    return [id, axis === "x" ? { scale_x: -scale } : { scale_y: -scale }];
  }));
  editor.documentCommands.updatePresentations(patches);
  const label = axis === "x" ? "水平" : "垂直";
  return { success: true, message: `已${label}翻转 ${selected.length} 个元素` };
}
