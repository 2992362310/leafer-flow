import type Editor from "../editor";
import type { CommandResult } from "../api/command";
import { VIDEO_ASSET_MAX_BYTES } from "../document/resources";

const MAX_VIDEO_WIDTH = 640;
const MAX_VIDEO_HEIGHT = 360;

export function doVideo(editor: Editor): Promise<CommandResult> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/*";
  input.style.display = "none";
  document.body.appendChild(input);

  return new Promise<CommandResult>((resolve) => {
    let settled = false;
    const cleanup = () => {
      input.onchange = null;
      input.oncancel = null;
      input.remove();
    };
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ success: false, message: "未选择视频" });
        return;
      }

      try {
        const videoFile = resolveVideoFile(file);
        editor.resources.validateFile(videoFile);
        const dimensions = await loadVideoDimensions(videoFile);
        const resource = await editor.resources.prepare(videoFile);
        if (editor.isDisposed) throw new Error("编辑器已关闭");

        const ratio = Math.min(1, MAX_VIDEO_WIDTH / dimensions.width, MAX_VIDEO_HEIGHT / dimensions.height);
        const width = Math.max(1, Math.round(dimensions.width * ratio));
        const height = Math.max(1, Math.round(dimensions.height * ratio));
        const id = crypto.randomUUID();
        editor.documentCommands.insertNode({
          id,
          type: "Video",
          version: 1,
          data: {
            assetId: resource.id,
            x: 200,
            y: 200,
            width,
            height,
            volume: 1,
            muted: true,
            loop: false,
            autoplay: false,
            editable: true,
            name: file.name.replace(/\.[^.]+$/, ""),
          },
          children: [],
        }, undefined, [resource]);
        const element = editor.renderer.getNode(id);
        if (element) editor.app.editor.select(element);
        finish({ success: true, message: `已插入视频: ${file.name}` });
      } catch (error) {
        console.error("插入视频失败", error);
        const detail = error instanceof Error ? error.message : "未知错误";
        const message = detail === "Video resource exceeds the per-file size limit"
          ? `视频文件超过单文件上限（${Math.round(VIDEO_ASSET_MAX_BYTES / 1024 / 1024)} MB），请压缩后重试`
          : detail === "Resource exceeds the per-file size limit"
            ? "资源文件超过单文件上限，请压缩后重试"
            : detail === "Document resource size limit exceeded"
              ? "插入视频后文档资源总量会超过 100 MB 限制，请清理资源或压缩视频"
              : detail;
        finish({
          success: false,
          message: "插入视频失败: " + message,
        });
      }
    };

    input.oncancel = () => finish({ success: false, message: "已取消" });
    input.click();
  });
}

function resolveVideoFile(file: File): Blob {
  if (file.type.startsWith("video/")) return file;
  const extension = file.name.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    webm: "video/webm",
    ogv: "video/ogg",
  };
  const mimeType = extension ? mimeTypes[extension] : undefined;
  if (!mimeType) throw new Error("无法识别视频格式，请选择 MP4、MOV、WebM 或 OGV 文件");
  return new Blob([file], { type: mimeType });
}

function loadVideoDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    let settled = false;
    let timeoutId: number | undefined;
    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.onabort = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    const finish = (error?: Error, dimensions?: { width: number; height: number }) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else if (dimensions) resolve(dimensions);
      else reject(new Error("无法读取视频尺寸"));
    };
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) finish(undefined, { width, height });
      else finish(new Error("视频元数据中没有有效的宽高"));
    };
    video.onerror = () => {
      finish(new Error(video.error?.message || "浏览器无法解码该视频格式"));
    };
    video.onabort = () => finish(new Error("读取视频元数据已中断"));
    timeoutId = window.setTimeout(() => finish(new Error("读取视频元数据超时")), 15000);
    video.src = url;
    video.load();
  });
}
