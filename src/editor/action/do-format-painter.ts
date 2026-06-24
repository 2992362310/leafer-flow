import type { IUI } from "leafer";
import type Editor from "../editor";

interface StyleSnapshot {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  cornerRadius?: number;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  textColor?: string;
}

let copiedStyle: StyleSnapshot | null = null;

export function doFormatPainterCopy(editor: Editor): { success: boolean; message: string } {
  const selected = editor.app.editor.list as IUI[];
  if (!selected.length) {
    return { success: false, message: "请先选中一个元素" };
  }

  const el = selected[0];
  const children = (el as unknown as { children?: IUI[] }).children;

  // 找到形状子元素
  let shape: IUI | null = null;
  let text: IUI | null = null;

  if (el.tag === "Group" && children?.length) {
    for (const child of children) {
      if (child instanceof Text) {
        text = child;
      } else if (!shape) {
        shape = child;
      }
    }
  } else {
    shape = el;
  }

  const style: StyleSnapshot = {};

  if (shape) {
    style.fill = shape.fill as string | undefined;
    style.stroke = shape.stroke as string | undefined;
    style.strokeWidth = shape.strokeWidth as number | undefined;
    style.opacity = shape.opacity as number | undefined;
    style.cornerRadius = (shape as unknown as { cornerRadius?: number }).cornerRadius;
  }

  if (text) {
    style.fontSize = (text as unknown as { fontSize?: number }).fontSize;
    style.fontWeight = (text as unknown as { fontWeight?: string }).fontWeight;
    style.fontStyle = (text as unknown as { fontStyle?: string }).fontStyle;
    style.textAlign = (text as unknown as { textAlign?: string }).textAlign;
    style.textColor = text.fill as string | undefined;
  }

  copiedStyle = style;
  return { success: true, message: "已复制样式" };
}

export function doFormatPainterApply(editor: Editor): { success: boolean; message: string } {
  if (!copiedStyle) {
    return { success: false, message: "请先复制样式（Ctrl+Shift+C）" };
  }

  const selected = editor.app.editor.list as IUI[];
  if (!selected.length) {
    return { success: false, message: "请先选中要应用样式的元素" };
  }

  selected.forEach((el) => {
    const children = (el as unknown as { children?: IUI[] }).children;

    let shape: IUI | null = null;
    let text: IUI | null = null;

    if (el.tag === "Group" && children?.length) {
      for (const child of children) {
        if (child instanceof Text) {
          text = child;
        } else if (!shape) {
          shape = child;
        }
      }
    } else {
      shape = el;
    }

    if (shape) {
      if (copiedStyle!.fill !== undefined) shape.fill = copiedStyle!.fill;
      if (copiedStyle!.stroke !== undefined) shape.stroke = copiedStyle!.stroke;
      if (copiedStyle!.strokeWidth !== undefined) shape.strokeWidth = copiedStyle!.strokeWidth;
      if (copiedStyle!.opacity !== undefined) shape.opacity = copiedStyle!.opacity;
      if (copiedStyle!.cornerRadius !== undefined) {
        (shape as unknown as { cornerRadius: number }).cornerRadius = copiedStyle!.cornerRadius;
      }
    }

    if (text) {
      if (copiedStyle!.fontSize !== undefined) {
        (text as unknown as { fontSize: number }).fontSize = copiedStyle!.fontSize;
      }
      if (copiedStyle!.fontWeight !== undefined) {
        (text as unknown as { fontWeight: string }).fontWeight = copiedStyle!.fontWeight;
      }
      if (copiedStyle!.fontStyle !== undefined) {
        (text as unknown as { fontStyle: string }).fontStyle = copiedStyle!.fontStyle;
      }
      if (copiedStyle!.textAlign !== undefined) {
        (text as unknown as { textAlign: string }).textAlign = copiedStyle!.textAlign;
      }
      if (copiedStyle!.textColor !== undefined) {
        text.fill = copiedStyle!.textColor;
      }
    }
  });

  editor.commitMutation();
  return { success: true, message: `已应用样式到 ${selected.length} 个元素` };
}
