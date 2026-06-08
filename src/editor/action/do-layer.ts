import { Group, type IUI, type IGroup } from "leafer";
import type Editor from "../editor";

type LayerAction = "bringForward" | "sendBackward" | "bringToFront" | "sendToBack";

export function doLayer(
  editor: Editor,
  action: LayerAction,
): { success: boolean; message: string } {
  try {
    const list = [...(editor.app.editor.list as IUI[])];
    if (!list.length) {
      return { success: false, message: "未选中元素" };
    }

    const moved = new Set<IUI>();
    const sorted = [...list].sort((a, b) => {
      const parentA = a.parent as IGroup | undefined;
      const parentB = b.parent as IGroup | undefined;
      if (parentA !== parentB) return 0;
      const indexA = parentA?.children?.indexOf(a) ?? -1;
      const indexB = parentB?.children?.indexOf(b) ?? -1;
      return indexA - indexB;
    });

    if (action === "bringForward") {
      [...sorted].reverse().forEach((node) => moveWithinParent(node, 1, moved));
    }
    if (action === "sendBackward") {
      sorted.forEach((node) => moveWithinParent(node, -1, moved));
    }
    if (action === "bringToFront") {
      [...sorted].reverse().forEach((node) => moveToEdge(node, 1, moved));
    }
    if (action === "sendToBack") {
      sorted.forEach((node) => moveToEdge(node, -1, moved));
    }

    if (!moved.size) {
      return { success: false, message: "当前元素无法调整层级" };
    }

    editor.commitMutation({ autoSave: false });
    return { success: true, message: `已调整 ${moved.size} 个元素的层级` };
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

  list.forEach((item) => {
    item.locked = locked;
  });

  editor.commitMutation({ autoSave: false });
  return { success: true, message: locked ? "已锁定选中元素" : "已解锁选中元素" };
}

export function doToggleVisible(
  editor: Editor,
  visible: boolean,
): { success: boolean; message: string } {
  const list = editor.app.editor.list as IUI[];
  if (!list.length) return { success: false, message: "未选中元素" };

  list.forEach((item) => {
    item.visible = visible;
  });

  editor.commitMutation({ autoSave: false });
  return { success: true, message: visible ? "已显示选中元素" : "已隐藏选中元素" };
}

function moveWithinParent(node: IUI, direction: 1 | -1, moved: Set<IUI>) {
  const parent = node.parent as IGroup | undefined;
  if (!parent?.children) return;

  const children = parent.children as IUI[];
  const index = children.indexOf(node);
  if (index < 0) return;

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= children.length) return;

  const target = children[nextIndex];
  if (direction > 0) {
    parent.addAfter(node, target);
  } else {
    parent.addBefore(node, target);
  }

  moved.add(node);
}

function moveToEdge(node: IUI, direction: 1 | -1, moved: Set<IUI>) {
  const parent = node.parent as IGroup | undefined;
  if (!parent?.children) return;

  const children = parent.children as IUI[];
  const index = children.indexOf(node);
  if (index < 0) return;

  const target = direction > 0 ? children[children.length - 1] : children[0];
  if (!target || target === node) return;

  if (direction > 0) {
    parent.addAfter(node, target);
  } else {
    parent.addBefore(node, target);
  }

  moved.add(node);
}
