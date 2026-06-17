<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import type Editor from "@/editor/editor";
import { useDraggable } from "@/composables/useDraggable";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

// UI 状态
const { position, isDragging, startDrag } = useDraggable({
  initialX: window.innerWidth - 220,
  initialY: window.innerHeight - 200,
});

const isCollapsed = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

// 缩略图尺寸
const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;

// 画布状态
const canvasState = shallowRef({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  scale: 1,
});

// 视口状态
const viewportState = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

let animationFrame: number | null = null;
let cleanupListeners: (() => void)[] = [];

// 初始化
onMounted(() => {
  if (props.editor?.app) {
    initListeners();
    updateCanvasState();
    renderMinimap();
  }
});

onUnmounted(() => {
  cleanup();
});

function initListeners() {
  const app = props.editor.app;

  // 监听画布变化
  const onDataChange = () => {
    scheduleRender();
  };

  const onViewChange = () => {
    updateViewport();
    scheduleRender();
  };

  app.tree.on("child.add", onDataChange);
  app.tree.on("child.remove", onDataChange);
  app.tree.on("render.end", onDataChange);

  // 监听视口变化
  app.on("viewport.change", onViewChange);
  app.on("zoom.change", onViewChange);

  cleanupListeners = [
    () => app.tree.off("child.add", onDataChange),
    () => app.tree.off("child.remove", onDataChange),
    () => app.tree.off("render.end", onDataChange),
    () => app.off("viewport.change", onViewChange),
    () => app.off("zoom.change", onViewChange),
  ];
}

function cleanup() {
  cleanupListeners.forEach((fn) => fn());
  cleanupListeners = [];
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function scheduleRender() {
  if (animationFrame) return;
  animationFrame = requestAnimationFrame(() => {
    animationFrame = null;
    updateCanvasState();
    renderMinimap();
  });
}

function updateCanvasState() {
  if (!props.editor?.app) return;

  const app = props.editor.app;
  const tree = app.tree;
  const children = tree.children || [];

  // 计算所有元素的边界框
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const bounds = child.getBounds("box", "page");
    if (bounds.x < minX) minX = bounds.x;
    if (bounds.y < minY) minY = bounds.y;
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
  }

  // 如果没有元素，使用默认值
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  // 添加边距
  const padding = 50;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  canvasState.value = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    scale: 1,
  };

  updateViewport();
}

function updateViewport() {
  if (!props.editor?.app) return;

  const app = props.editor.app;
  const view = app.view as HTMLElement;
  if (!view) return;

  const rect = view.getBoundingClientRect();
  const tree = app.tree;
  const scale = tree.scaleX || 1;

  // 计算视口在画布坐标系中的位置
  const viewportX = -tree.x / scale;
  const viewportY = -tree.y / scale;
  const viewportWidth = rect.width / scale;
  const viewportHeight = rect.height / scale;

  // 转换到缩略图坐标系
  const state = canvasState.value;
  const scaleX = MINIMAP_WIDTH / state.width;
  const scaleY = MINIMAP_HEIGHT / state.height;
  const mapScale = Math.min(scaleX, scaleY);

  viewportState.value = {
    x: (viewportX - state.x) * mapScale,
    y: (viewportY - state.y) * mapScale,
    width: viewportWidth * mapScale,
    height: viewportHeight * mapScale,
  };
}

function renderMinimap() {
  const canvas = canvasRef.value;
  if (!canvas || !props.editor?.app) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const app = props.editor.app;
  const children = app.tree.children || [];
  const state = canvasState.value;

  // 清空画布
  ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

  // 绘制背景
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

  // 计算缩放比例
  const scaleX = MINIMAP_WIDTH / state.width;
  const scaleY = MINIMAP_HEIGHT / state.height;
  const scale = Math.min(scaleX, scaleY);

  // 绘制元素
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-state.x, -state.y);

  for (const child of children) {
    drawElement(ctx, child);
  }

  ctx.restore();

  // 绘制视口
  const viewport = viewportState.value;
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
}

function drawElement(ctx: CanvasRenderingContext2D, element: any) {
  const bounds = element.getBounds("box", "page");
  const fill = element.fill || "#e2e8f0";
  const stroke = element.stroke || "#94a3b8";

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;

  // 根据元素类型绘制
  const tag = element.tag;
  if (tag === "Ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
      0, 0, Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  } else if (tag === "Path") {
    // 简化处理，绘制矩形
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  } else {
    // 默认绘制矩形
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
}

// 处理点击导航
function handleClick(e: MouseEvent) {
  if (!props.editor?.app) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  navigateToPoint(x, y);
}

// 处理拖拽导航
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    navigateToPoint(x, y);
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  // 立即导航到点击位置
  handleClick(e);
}

function navigateToPoint(mapX: number, mapY: number) {
  if (!props.editor?.app) return;

  const app = props.editor.app;
  const state = canvasState.value;
  const view = app.view as HTMLElement;
  if (!view) return;

  const rect = view.getBoundingClientRect();
  const scale = app.tree.scaleX || 1;

  // 转换缩略图坐标到画布坐标
  const canvasX = (mapX / MINIMAP_WIDTH) * state.width + state.x;
  const canvasY = (mapY / MINIMAP_HEIGHT) * state.height + state.y;

  // 计算新的视口位置（居中显示点击位置）
  const newX = -(canvasX * scale - rect.width / 2);
  const newY = -(canvasY * scale - rect.height / 2);

  // 应用变换
  app.tree.x = newX;
  app.tree.y = newY;

  updateViewport();
  renderMinimap();
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div
    ref="containerRef"
    class="card shadow-lg border border-base-200 bg-base-100/95 backdrop-blur-sm fixed overflow-hidden z-10"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: isCollapsed ? '2rem' : `${MINIMAP_WIDTH + 16}px`,
      height: isCollapsed ? '2rem' : `${MINIMAP_HEIGHT + 32}px`,
    }"
  >
    <!-- 标题栏 -->
    <div
      class="flex items-center justify-between px-2 py-1 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <span v-if="!isCollapsed" class="text-[10px] font-medium">缩略图</span>
      <button
        class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0"
        @click.stop="toggleCollapse"
      >
        <span class="text-[10px]">{{ isCollapsed ? "□" : "−" }}</span>
      </button>
    </div>

    <!-- 缩略图内容 -->
    <div v-if="!isCollapsed" class="p-1">
      <canvas
        ref="canvasRef"
        :width="MINIMAP_WIDTH"
        :height="MINIMAP_HEIGHT"
        class="cursor-pointer border border-base-300 rounded"
        @mousedown="handleMouseDown"
      />
    </div>
  </div>
</template>
