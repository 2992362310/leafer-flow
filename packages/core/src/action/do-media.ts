import type Editor from "../editor";
import type { CommandResult } from "../api/command";
import { fitMedia, prepareImagePreview, readMediaMetadata } from "../core/media-import";
import type { JsonObject } from "../document/model";

type MediaKind = "image" | "video" | "audio";

export const doImage = (editor: Editor) => chooseMedia(editor, "image");
export const doVideo = (editor: Editor) => chooseMedia(editor, "video");
export const doAudio = (editor: Editor) => chooseMedia(editor, "audio");

function chooseMedia(editor: Editor, kind: MediaKind): Promise<CommandResult> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = `${kind}/*`;
  input.hidden = true;
  document.body.appendChild(input);
  return new Promise((resolve) => {
    const finish = (result: CommandResult) => {
      input.onchange = null;
      input.oncancel = null;
      input.remove();
      resolve(result);
    };
    input.oncancel = () => finish({ success: false, message: "已取消" });
    input.onchange = async () => {
      const selected = input.files?.[0];
      if (!selected) {
        finish({ success: false, message: "未选择文件" });
        return;
      }
      try {
        const file = resolveMediaFile(selected, kind);
        editor.resources.validateFile(file);
        const preview = kind === "image" ? await prepareImagePreview(file) : undefined;
        const metadata = kind !== "image" ? await readMediaMetadata(file, kind) : undefined;
        const original = await editor.resources.prepare(file);
        const assets = [original];
        const data: JsonObject = {
          assetId: original.id,
          x: 200,
          y: 200,
          name: selected.name,
          editable: true,
        };
        if (preview) {
          const resource = await editor.resources.prepare(preview.file);
          assets.push(resource);
          Object.assign(data, fitMedia(preview.width, preview.height, 300), {
            assetId: resource.id,
            original: { assetId: original.id },
          });
        } else if (metadata) {
          Object.assign(data, {
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            volume: 1,
            muted: kind === "video",
            loop: false,
            autoplay: false,
          });
          if (metadata.poster) {
            const poster = await editor.resources.prepare(metadata.poster);
            assets.push(poster);
            data.poster = { assetId: poster.id };
          }
        }
        if (editor.isDisposed) throw new Error("编辑器已关闭");
        const id = crypto.randomUUID();
        editor.documentCommands.insertNode(
          {
            id,
            type: kind === "image" ? "Image" : kind === "video" ? "Video" : "Audio",
            version: 1,
            data,
            children: [],
          },
          undefined,
          assets,
        );
        const element = editor.renderer.getNode(id);
        if (element) editor.app.editor.select(element);
        finish({ success: true, message: `已插入: ${selected.name}` });
      } catch (error) {
        finish({
          success: false,
          message: `导入失败: ${error instanceof Error ? error.message : "未知错误"}`,
        });
      }
    };
    input.click();
  });
}

function resolveMediaFile(file: File, kind: MediaKind): Blob {
  if (file.type.startsWith(`${kind}/`)) return file;
  const types: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    webm: "video/webm",
    ogv: "video/ogg",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };
  const type = types[file.name.toLowerCase().split(".").pop() ?? ""];
  if (!type?.startsWith(`${kind}/`)) throw new Error("文件类型与导入类型不符");
  return file.slice(0, file.size, type);
}
