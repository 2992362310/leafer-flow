import { ref, type Ref } from "vue";
import type { IUI } from "leafer";
import type { Editor } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import { collectSelectableItems } from "@/editor/utils/selection";

const MARQUEE_MIN_SIZE = 6;

type MarqueeLogLevel = "info" | "success" | "warning" | "error";

interface MarqueeState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseSelectionMarqueeOptions {
  editor: Ref<Editor | undefined>;
  selectedTool: Ref<string | undefined>;
  addCleanup: (cleanup: () => void) => void;
  onLog?: (message: string, level: MarqueeLogLevel) => void;
}

export function useSelectionMarquee({
  editor,
  selectedTool,
  addCleanup,
  onLog,
}: UseSelectionMarqueeOptions) {
  const marquee = ref<MarqueeState>({ active: false, x: 0, y: 0, width: 0, height: 0 });
  let marqueeStart = { x: 0, y: 0 };
  let marqueeDragging = false;

  function bind(currentEditor: Editor) {
    const container = currentEditor.app.view as HTMLElement;
    if (!container) return;

    const onDown = (evt: PointerEvent) => handleMarqueeDown(evt, container);
    const onMove = (evt: PointerEvent) => handleMarqueeMove(evt, container);
    const onUp = (evt: PointerEvent) => handleMarqueeUp(evt, container);

    container.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    addCleanup(() => {
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    });
  }

  function getCanvasPoint(evt: PointerEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function handleMarqueeDown(evt: PointerEvent, container: HTMLElement) {
    if (!editor.value || evt.button !== 0) return;
    if (selectedTool.value && selectedTool.value !== TOOL_NAME.SELECT) return;
    if (evt.target !== container) return;

    const point = getCanvasPoint(evt, container);
    marqueeStart = point;
    marqueeDragging = true;
    marquee.value = { active: true, x: point.x, y: point.y, width: 0, height: 0 };
  }

  function handleMarqueeMove(evt: PointerEvent, container: HTMLElement) {
    if (!marqueeDragging) return;
    const point = getCanvasPoint(evt, container);
    const x = Math.min(marqueeStart.x, point.x);
    const y = Math.min(marqueeStart.y, point.y);
    const width = Math.abs(point.x - marqueeStart.x);
    const height = Math.abs(point.y - marqueeStart.y);
    marquee.value = { active: true, x, y, width, height };
  }

  function handleMarqueeUp(evt: PointerEvent, container: HTMLElement) {
    if (!marqueeDragging || !editor.value) return;
    marqueeDragging = false;

    const point = getCanvasPoint(evt, container);
    const x = Math.min(marqueeStart.x, point.x);
    const y = Math.min(marqueeStart.y, point.y);
    const width = Math.abs(point.x - marqueeStart.x);
    const height = Math.abs(point.y - marqueeStart.y);
    marquee.value.active = false;

    if (width < MARQUEE_MIN_SIZE && height < MARQUEE_MIN_SIZE) return;
    selectWithinBounds({ x, y, width, height });
  }

  function selectWithinBounds(bounds: { x: number; y: number; width: number; height: number }) {
    if (!editor.value) return;
    const items = collectSelectableItems((editor.value.app.tree.children || []) as IUI[]);
    const selected = items.filter((item) => {
      const box = item.getBounds("box", "page");
      return (
        box.x < bounds.x + bounds.width &&
        box.x + box.width > bounds.x &&
        box.y < bounds.y + bounds.height &&
        box.y + box.height > bounds.y
      );
    });

    if (!selected.length) return;
    editor.value.app.editor.select(selected);
    onLog?.(`框选 ${selected.length} 个元素`, "info");
  }

  return { marquee, bind };
}
