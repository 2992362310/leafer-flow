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

export function doLoad(editor: Editor): { success: boolean; message: string } {
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
        deserializeTreeWithConnectors(editor.app, json);
        editor.history.save();
        editor.autoSave.save();

        resolve({ success: true, message: "文件已加载" });
      } catch (error) {
        console.error("加载文件时发生错误", error);
        resolve({
          success: false,
          message: "加载失败: " + (error instanceof Error ? error.message : "未知错误"),
        });
      }
    };

    input.click();
  }) as unknown as { success: boolean; message: string };
}

export function doExportPNG(editor: Editor): { success: boolean; message: string } {
  try {
    const dataURL = editor.app.tree.export("png") as string;
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

export function doExportSVG(editor: Editor): { success: boolean; message: string } {
  try {
    const svg = editor.app.tree.export("svg") as string;
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
