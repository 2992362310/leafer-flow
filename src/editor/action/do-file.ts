import type Editor from "../editor";
import {
  deserializeTreeWithConnectors,
  serializeTreeWithConnectors,
} from "../core/flow-serialization";

export function doSave(editor: Editor): { success: boolean; message: string } {
  try {
    const data = serializeTreeWithConnectors(editor.app);
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: "文件已保存" };
  } catch (error) {
    console.error("保存文件时发生错误", error);
    return {
      success: false,
      message: "保存失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

export function doLoad(editor: Editor): Promise<{ success: boolean; message: string }> {
  return new Promise<{ success: boolean; message: string }>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, message: "未选择文件" });
        return;
      }

      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;

        editor.app.editor.cancel();
        const result = deserializeTreeWithConnectors(editor.app, json);
        editor.commitMutation();

        let message = "文件已加载";
        if (result.failedConnectors > 0) {
          message += `，${result.failedConnectors} 条连接线恢复节点绑定失败，已转为浮动线段`;
        }
        resolve({ success: true, message });
      } catch (error) {
        console.error("加载文件时发生错误", error);
        resolve({
          success: false,
          message: "加载失败: " + (error instanceof Error ? error.message : "未知错误"),
        });
      }
    };

    input.click();
  });
}

export async function doExportPNG(editor: Editor): Promise<{ success: boolean; message: string }> {
  try {
    const dataURL = await exportAsUrl(editor, "png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `flow-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { success: true, message: "PNG 已导出" };
  } catch (error) {
    console.error("导出 PNG 时发生错误", error);
    return {
      success: false,
      message: "导出失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

export async function doExportSVG(editor: Editor): Promise<{ success: boolean; message: string }> {
  try {
    const svg = await exportAsText(editor, "svg");
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: "SVG 已导出" };
  } catch (error) {
    console.error("导出 SVG 时发生错误", error);
    return {
      success: false,
      message: "导出失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

type ExportResultLike = string | Blob | { data?: string | Blob; url?: string };

async function exportAsUrl(editor: Editor, format: "png" | "svg") {
  const result = (await editor.app.tree.export(format)) as ExportResultLike;
  if (typeof result === "string") return result;
  if (result instanceof Blob) return URL.createObjectURL(result);
  if (typeof result.url === "string") return result.url;
  if (typeof result.data === "string") return result.data;
  if (result.data instanceof Blob) return URL.createObjectURL(result.data);
  throw new Error("无法识别导出结果");
}

async function exportAsText(editor: Editor, format: "svg") {
  const result = (await editor.app.tree.export(format)) as ExportResultLike;
  if (typeof result === "string") return result;
  if (result instanceof Blob) return result.text();
  if (typeof result.data === "string") return result.data;
  if (result.data instanceof Blob) return result.data.text();
  if (typeof result.url === "string") {
    const response = await fetch(result.url);
    return response.text();
  }
  throw new Error("无法识别导出结果");
}
