import { ref, onUnmounted } from "vue";

export interface DraggableOptions {
  initialX?: number;
  initialY?: number;
}

/**
 * 可组合函数：为浮动面板提供拖拽功能
 */
export function useDraggable(options: DraggableOptions = {}) {
  const position = ref({
    x: options.initialX ?? 0,
    y: options.initialY ?? 0,
  });
  const isDragging = ref(false);
  const dragOffset = ref({ x: 0, y: 0 });

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;
    position.value = {
      x: event.clientX - dragOffset.value.x,
      y: event.clientY - dragOffset.value.y,
    };
  };

  const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  const startDrag = (event: MouseEvent) => {
    isDragging.value = true;
    dragOffset.value = {
      x: event.clientX - position.value.x,
      y: event.clientY - position.value.y,
    };

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
    event.preventDefault();
  };

  onUnmounted(() => {
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  });

  return {
    position,
    isDragging,
    startDrag,
    stopDrag,
  };
}

/**
 * 可组合函数：为浮动面板提供折叠功能
 */
export function useCollapsible(initialCollapsed = false) {
  const isCollapsed = ref(initialCollapsed);

  const toggleCollapse = (isDragging: boolean = false) => {
    if (isDragging) return;
    isCollapsed.value = !isCollapsed.value;
  };

  return {
    isCollapsed,
    toggleCollapse,
  };
}
