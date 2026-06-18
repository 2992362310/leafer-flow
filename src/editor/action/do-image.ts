import type Editor from "../editor";

export function doImage(editor: Editor): { success: boolean; message: string } {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  document.body.appendChild(input);

  return new Promise<{ success: boolean; message: string }>((resolve) => {
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        resolve({ success: false, message: "未选择文件" });
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const img = await loadImage(dataUrl);

        // 计算合适的尺寸（最大 300px，保持比例）
        const maxSize = 300;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // 创建 Leafer Image 元素
        const { Image } = await import("leafer");
        const element = new Image({
          url: dataUrl,
          x: 200,
          y: 200,
          width,
          height,
          editable: true,
          name: file.name.replace(/\.[^.]+$/, ""),
        });

        editor.app.tree.add(element);
        editor.app.editor.select(element);
        editor.commitMutation();

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
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
