import { ref, onUnmounted } from "vue";

export interface DraggableOptions {
  initialX?: number;
  initialY?: number;
  snapToViewport?: boolean;
  snapThreshold?: number;
  panelWidth?: number;
  panelHeight?: number;
  margin?: number;
  onDragEnd?: (position: { x: number; y: number }) => void;
}

/**
 * 可组合函数：为浮动面板提供拖拽功能
 */
export function useDraggable(options: DraggableOptions = {}) {
  const snapToViewport = options.snapToViewport ?? false;
  const snapThreshold = options.snapThreshold ?? 16;
  const panelWidth = options.panelWidth ?? 260;
  const panelHeight = options.panelHeight ?? 320;
  const margin = options.margin ?? 8;

  const position = ref({
    x: options.initialX ?? 0,
    y: options.initialY ?? 0,
  });
  const isDragging = ref(false);
  const hasMoved = ref(false);
  const dragOffset = ref({ x: 0, y: 0 });
  let rafId: number | null = null;
  let pendingPosition: { x: number; y: number } | null = null;

  const flushPendingPosition = () => {
    rafId = null;
    if (!pendingPosition) return;
    position.value = pendingPosition;
    pendingPosition = null;
  };

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;
    hasMoved.value = true;
    pendingPosition = {
      x: event.clientX - dragOffset.value.x,
      y: event.clientY - dragOffset.value.y,
    };
    if (rafId === null) {
      rafId = window.requestAnimationFrame(flushPendingPosition);
    }
  };

  const applyViewportSnap = () => {
    if (!snapToViewport) return;

    const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);

    let nextX = Math.min(Math.max(position.value.x, margin), maxX);
    let nextY = Math.min(Math.max(position.value.y, margin), maxY);

    if (Math.abs(nextX - margin) <= snapThreshold) nextX = margin;
    if (Math.abs(nextX - maxX) <= snapThreshold) nextX = maxX;
    if (Math.abs(nextY - margin) <= snapThreshold) nextY = margin;
    if (Math.abs(nextY - maxY) <= snapThreshold) nextY = maxY;

    position.value = { x: nextX, y: nextY };
  };

  const stopDrag = () => {
    isDragging.value = false;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      flushPendingPosition();
    }
    applyViewportSnap();
    options.onDragEnd?.(position.value);
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  const startDrag = (event: MouseEvent) => {
    isDragging.value = true;
    hasMoved.value = false;
    dragOffset.value = {
      x: event.clientX - position.value.x,
      y: event.clientY - position.value.y,
    };

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
    event.preventDefault();
  };

  onUnmounted(() => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  });

  return {
    position,
    isDragging,
    hasMoved,
    startDrag,
    stopDrag,
  };
}

/**
 * 可组合函数：为浮动面板提供折叠功能
 */
export function useCollapsible(initialCollapsed = false) {
  const isCollapsed = ref(initialCollapsed);

  const toggleCollapse = (wasDragged: boolean = false) => {
    if (wasDragged) return;
    isCollapsed.value = !isCollapsed.value;
  };

  return {
    isCollapsed,
    toggleCollapse,
  };
}
