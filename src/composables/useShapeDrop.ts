import type { Ref } from "vue";
import type { Editor } from "@/editor";
import type { ShapeLibraryItem } from "@/editor/shape-library";
import { SHAPE_DROP_MIME } from "@/editor/shape-library";

type ShapeDropLogLevel = "info" | "success" | "warning" | "error";

interface UseShapeDropOptions {
  editor: Ref<Editor | undefined>;
  editorElement: Ref<HTMLElement | null>;
  addCleanup: (cleanup: () => void) => void;
  onCreated?: () => void;
  onLog?: (message: string, level: ShapeDropLogLevel) => void;
}

export function useShapeDrop({
  editor,
  editorElement,
  addCleanup,
  onCreated,
  onLog,
}: UseShapeDropOptions) {
  function bind(currentEditor: Editor) {
    const container = currentEditor.app.view as HTMLElement;
    if (!container) return;

    const onDragOver = (evt: DragEvent) => {
      if (!evt.dataTransfer?.types.includes(SHAPE_DROP_MIME)) return;
      evt.preventDefault();
      evt.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (evt: DragEvent) => {
      const raw = evt.dataTransfer?.getData(SHAPE_DROP_MIME);
      if (!raw) return;

      evt.preventDefault();
      try {
        const item = JSON.parse(raw) as ShapeLibraryItem;
        createShapeAtPointer(item, evt);
      } catch (error) {
        console.warn("解析拖拽图形失败", error);
      }
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);

    addCleanup(() => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    });
  }

  function createShapeAtPointer(item: ShapeLibraryItem, evt: DragEvent) {
    if (!editor.value || !editorElement.value) return;

    const rect = editorElement.value.getBoundingClientRect();
    const width = item.width ?? 120;
    const height = item.height ?? 72;
    const startPoint = {
      x: evt.clientX - rect.left - width / 2,
      y: evt.clientY - rect.top - height / 2,
    };

    const element = editor.value.createElementFromTool(item.tool, startPoint, { width, height });
    if (!element) {
      onLog?.(`暂不支持拖拽创建：${item.label}`, "warning");
      return;
    }

    onCreated?.();
    onLog?.(`已创建 ${item.label}`, "success");
  }

  return { bind };
}
