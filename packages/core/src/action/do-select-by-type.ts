import type { IUI } from "leafer";
import type Editor from "../editor";

export function doSelectByType(editor: Editor): { success: boolean; message: string } {
  const selected = editor.app.editor.list as IUI[];
  if (!selected.length) {
    return { success: false, message: "请先选中一个元素" };
  }

  const targetTag = selected[0].tag;
  const targetName = selected[0].name || "";
  const children = editor.app.tree.children as IUI[];

  const matches: IUI[] = [];

  function walk(items: IUI[]) {
    for (const item of items) {
      if (item.tag === targetTag) {
        // 如果有名称，按名称匹配；否则按 tag 匹配
        if (targetName) {
          if ((item.name || "") === targetName) matches.push(item);
        } else {
          matches.push(item);
        }
      }
      const childChildren = (item as unknown as { children?: IUI[] }).children;
      if (childChildren?.length) walk(childChildren as IUI[]);
    }
  }

  walk(children);

  if (matches.length <= 1) {
    return { success: false, message: "画布上没有其他同类型元素" };
  }

  editor.app.editor.select(matches);
  return { success: true, message: `已选中 ${matches.length} 个同类型元素` };
}
