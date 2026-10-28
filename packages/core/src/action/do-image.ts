import type Editor from "../editor";
import type { CommandResult } from "../api/command";

export function doImage(editor: Editor): Promise<CommandResult> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  document.body.appendChild(input);

  return new Promise<CommandResult>((resolve) => {
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        resolve({ success: false, message: "未选择文件" });
        return;
      }

      try {
        if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
        const resource = await editor.resources.prepare(file);
        const img = await loadImage(editor.resources.resolve(resource.id));
        if (editor.isDisposed) throw new Error("编辑器已关闭");

        // 计算合适的尺寸（最大 300px，保持比例）
        const maxSize = 300;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const id = crypto.randomUUID();
        editor.documentCommands.insertNode({
          id,
          type: "Image",
          version: 1,
          data: { assetId: resource.id, x: 200, y: 200, width, height, editable: true, name: file.name.replace(/\.[^.]+$/, "") },
          children: [],
        }, undefined, [resource]);
        const element = editor.renderer.getNode(id);
        if (element) editor.app.editor.select(element);

        resolve({ success: true, message: `已插入图片: ${file.name}` });
      } catch (error) {
        console.error("插入图片失败", error);
        resolve({
          success: false,
          message: "插入图片失败: " + (error instanceof Error ? error.message : "未知错误"),
        });
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve({ success: false, message: "已取消" });
    };

    input.click();
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("加载图片失败"));
    img.src = url;
  });
}
