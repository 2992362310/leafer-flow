import type { IUI } from "leafer";
import type Editor from "../editor";
import { ACTION_NAME } from "../constants";

type AlignAction = (typeof ACTION_NAME)[keyof typeof ACTION_NAME];

type Bounds = {
  node: IUI;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function doAlign(
  editor: Editor,
  action: AlignAction,
): { success: boolean; message: string } {
  const list = [...(editor.app.editor.list as IUI[])];
  if (list.length < 2) {
    return { success: false, message: "请至少选择两个元素" };
  }

  const bounds = list.map((node) => {
    const box = node.getBounds("box", "page");
    return { node, x: box.x, y: box.y, width: box.width, height: box.height };
  });

  const minX = Math.min(...bounds.map((item) => item.x));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));
  const centerX = minX + (maxX - minX) / 2;
  const centerY = minY + (maxY - minY) / 2;

  if (action === ACTION_NAME.DISTRIBUTE_HORIZONTAL) {
    distribute(bounds, "x");
  } else if (action === ACTION_NAME.DISTRIBUTE_VERTICAL) {
    distribute(bounds, "y");
  } else {
    bounds.forEach((item) => {
      if (action === ACTION_NAME.ALIGN_LEFT) moveByPageDelta(item.node, minX - item.x, 0);
      if (action === ACTION_NAME.ALIGN_CENTER) {
        moveByPageDelta(item.node, centerX - (item.x + item.width / 2), 0);
      }
      if (action === ACTION_NAME.ALIGN_RIGHT) {
        moveByPageDelta(item.node, maxX - (item.x + item.width), 0);
      }
      if (action === ACTION_NAME.ALIGN_TOP) moveByPageDelta(item.node, 0, minY - item.y);
      if (action === ACTION_NAME.ALIGN_MIDDLE) {
        moveByPageDelta(item.node, 0, centerY - (item.y + item.height / 2));
      }
      if (action === ACTION_NAME.ALIGN_BOTTOM) {
        moveByPageDelta(item.node, 0, maxY - (item.y + item.height));
      }
    });
  }

  editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
  return { success: true, message: "已调整选中元素" };
}

function distribute(bounds: Bounds[], axis: "x" | "y") {
  const sorted = [...bounds].sort((a, b) => axisValue(a, axis) - axisValue(b, axis));
  if (sorted.length < 3) return;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = axisValue(first, axis);
  const end = axisValue(last, axis);
  const totalSize = sorted.reduce((sum, item) => sum + sizeValue(item, axis), 0);
  const gap = (end + sizeValue(last, axis) - start - totalSize) / (sorted.length - 1);

  let cursor = start;
  sorted.forEach((item, index) => {
    if (index > 0 && index < sorted.length - 1) {
      const delta = cursor - axisValue(item, axis);
      moveByPageDelta(item.node, axis === "x" ? delta : 0, axis === "y" ? delta : 0);
    }
    cursor += sizeValue(item, axis) + gap;
  });
}

function axisValue(item: Bounds, axis: "x" | "y") {
  return axis === "x" ? item.x : item.y;
}

function sizeValue(item: Bounds, axis: "x" | "y") {
  return axis === "x" ? item.width : item.height;
}

function moveByPageDelta(node: IUI, dx: number, dy: number) {
  node.x = (node.x || 0) + dx;
  node.y = (node.y || 0) + dy;
}
