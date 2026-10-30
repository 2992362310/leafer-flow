import { imageDimensionsFromData } from "image-dimensions";

const MAX_IMAGE_PIXELS = 32 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2048;

export function fitMedia(width: number, height: number, limit: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("媒体尺寸无效");
  const scale = Math.min(1, limit / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImagePreview(file: Blob) {
  const dimensions = imageDimensionsFromData(
    new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer()),
  );
  if (!dimensions) throw new Error("无法读取图片尺寸，请使用 PNG、JPEG、WebP、GIF、AVIF 或 HEIF");
  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS)
    throw new Error("图片超过 3200 万像素，请先缩小原图");
  const size = fitMedia(dimensions.width, dimensions.height, MAX_IMAGE_SIDE);
  const bitmap = await createImageBitmap(file, {
    resizeWidth: size.width,
    resizeHeight: size.height,
    resizeQuality: "high",
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建图片预览");
    context.drawImage(bitmap, 0, 0);
    return { file: await canvasBlob(canvas), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function readMediaMetadata(file: Blob, type: "video" | "audio") {
  const element = document.createElement(type);
  const url = URL.createObjectURL(file);
  element.preload = "auto";
  element.muted = true;
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("读取媒体元数据超时")), 15000);
    const finish = (error?: Error) => {
      clearTimeout(timer);
      element.onloadedmetadata = null;
      element.onloadeddata = null;
      element.onerror = null;
      element.onabort = null;
      if (error) reject(error);
      else resolve();
    };
    element.onloadedmetadata = () => {
      if (type === "audio") finish();
      else {
        const video = element as HTMLVideoElement;
        if (video.videoWidth * video.videoHeight > MAX_IMAGE_PIXELS)
          finish(new Error("视频分辨率过大，请先压缩"));
      }
    };
    if (type === "video") element.onloadeddata = () => finish();
    element.onerror = () => finish(new Error(element.error?.message || "浏览器无法解码该媒体格式"));
    element.onabort = () => finish(new Error("读取媒体已中断"));
    element.src = url;
    element.load();
  });
  try {
    await ready;
    if (!Number.isFinite(element.duration) || element.duration <= 0)
      throw new Error("媒体时长无效");
    if (element instanceof HTMLVideoElement) {
      const size = fitMedia(element.videoWidth, element.videoHeight, 640);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法创建视频封面");
      context.drawImage(element, 0, 0, size.width, size.height);
      return { ...size, duration: element.duration, poster: await canvasBlob(canvas) };
    }
    return { width: 240, height: 64, duration: element.duration, poster: undefined };
  } finally {
    element.removeAttribute("src");
    element.load();
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("无法编码媒体预览"))),
      "image/webp",
      0.85,
    ),
  );
}
