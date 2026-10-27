import type { IUI } from "leafer";
import type Editor from "../editor";
import type { LayerOrderAction } from "../document/element-operations";

export function doLayer(
  editor: Editor,
  action: LayerOrderAction,
): { success: boolean; message: string } {
  try {
    const list = [...(editor.app.editor.list as IUI[])];
    if (!list.length) {
      return { success: false, message: "未选中元素" };
    }

    const moved = editor.documentCommands.reorderElements(list.map((node) => editor.renderer.getId(node)), action);
    if (!moved) {
      return { success: false, message: "当前元素无法调整层级" };
    }

    return { success: true, message: `已调整 ${moved} 个元素的层级` };
  } catch (error) {
    console.error("调整层级失败", error);
    return {
      success: false,
      message: "调整层级失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

export function doToggleLock(
  editor: Editor,
  locked: boolean,
): { success: boolean; message: string } {
  const list = editor.app.editor.list as IUI[];
  if (!list.length) return { success: false, message: "未选中元素" };

  editor.documentCommands.setElementState(list.map((item) => editor.renderer.getId(item)), { locked });
  return { success: true, message: locked ? "已锁定选中元素" : "已解锁选中元素" };
}

export function doToggleVisible(
  editor: Editor,
  visible: boolean,
): { success: boolean; message: string } {
  const list = editor.app.editor.list as IUI[];
  if (!list.length) return { success: false, message: "未选中元素" };

  editor.documentCommands.setElementState(list.map((item) => editor.renderer.getId(item)), { visible });
  return { success: true, message: visible ? "已显示选中元素" : "已隐藏选中元素" };
}

export function doUnlockAll(editor: Editor): { success: boolean; message: string } {
  const count = editor.documentCommands.unlockAll();

  if (count === 0) {
    return { success: false, message: "没有锁定的元素" };
  }

  return { success: true, message: `已解锁 ${count} 个元素` };
}

export function doUnlockAtCursor(
  editor: Editor,
  x: number,
  y: number,
): { success: boolean; message: string } {
  const tree = editor.app.tree;

  // 递归查找锁定的元素
  function findLockedAtPoint(items: IUI[]): IUI | null {
    for (const item of items) {
      // 先检查子元素（后添加的在上面）
      const childChildren = (item as unknown as { children?: IUI[] }).children;
      if (childChildren?.length) {
        const child = findLockedAtPoint(childChildren as IUI[]);
        if (child) return child;
      }

      if (!item.locked) continue;

      // 检查点是否在元素范围内
      try {
        const worldBounds = item.getBounds("box", "world");
        const wx = worldBounds.x;
        const wy = worldBounds.y;
        const ww = worldBounds.width;
        const wh = worldBounds.height;
        if (x >= wx && x <= wx + ww && y >= wy && y <= wy + wh) {
          return item;
        }
      } catch {
        // 忽略获取 bounds 失败
      }
    }
    return null;
  }

  const locked = findLockedAtPoint(tree.children as IUI[]);
  if (!locked) {
    return { success: false, message: "该位置没有锁定的元素" };
  }

  const id = editor.renderer.getId(locked);
  editor.documentCommands.setElementState([id], { locked: false });
  const view = editor.renderer.getNode(id);
  if (view) editor.app.editor.select(view);
  return { success: true, message: "已解锁元素" };
}
