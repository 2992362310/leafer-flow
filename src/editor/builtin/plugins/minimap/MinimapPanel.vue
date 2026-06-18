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

  // 绘制背景（网格 pattern）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

  // 绘制网格
  ctx.strokeStyle = "#f1f5f9";
  ctx.lineWidth = 0.5;
  const gridSize = 20;
  for (let x = 0; x < MINIMAP_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MINIMAP_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < MINIMAP_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MINIMAP_WIDTH, y);
    ctx.stroke();
  }

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

  // 绘制视口边框
  const viewport = viewportState.value;
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);

  // 绘制视口角标
  const cornerSize = 6;
  ctx.fillStyle = "#3b82f6";
  // 左上角
  ctx.fillRect(viewport.x - 1, viewport.y - 1, cornerSize, 3);
  ctx.fillRect(viewport.x - 1, viewport.y - 1, 3, cornerSize);
  // 右上角
  ctx.fillRect(viewport.x + viewport.width - cornerSize + 1, viewport.y - 1, cornerSize, 3);
  ctx.fillRect(viewport.x + viewport.width - 2, viewport.y - 1, 3, cornerSize);
  // 左下角
  ctx.fillRect(viewport.x - 1, viewport.y + viewport.height - 2, cornerSize, 3);
  ctx.fillRect(viewport.x - 1, viewport.y + viewport.height - cornerSize + 1, 3, cornerSize);
  // 右下角
  ctx.fillRect(viewport.x + viewport.width - cornerSize + 1, viewport.y + viewport.height - 2, cornerSize, 3);
  ctx.fillRect(viewport.x + viewport.width - 2, viewport.y + viewport.height - cornerSize + 1, 3, cornerSize);
}

function drawElement(ctx: CanvasRenderingContext2D, element: any) {
  const tag = element.tag;

  // 跳过连接线
  if (tag === "Connector" || element.constructor?.name === "Connector") {
    drawConnector(ctx, element);
    return;
  }

  // 处理 Group 元素，递归绘制子元素
  if (tag === "Group" || element.isBranch) {
    const children = element.children;
    if (children && children.length > 0) {
      for (const child of children) {
        drawElement(ctx, child);
      }
      return;
    }
  }

  const bounds = element.getBounds("box", "page");
  if (!bounds || bounds.width === 0 || bounds.height === 0) return;

  // 获取样式
  const fill = normalizeColor(element.fill) || "#e2e8f0";
  const stroke = normalizeColor(element.stroke) || "#94a3b8";
  const strokeWidth = element.strokeWidth || 1;
  const opacity = element.opacity !== undefined ? element.opacity : 1;

  ctx.globalAlpha = opacity;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(strokeWidth, 0.5);

  // 根据元素类型绘制
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
    drawPathElement(ctx, element, bounds);
  } else if (tag === "Text") {
    drawTextElement(ctx, element, bounds);
  } else if (tag === "Rect") {
    // 矩形，可能有圆角
    const cornerRadius = element.cornerRadius || 0;
    if (cornerRadius > 0) {
      drawRoundedRect(ctx, bounds, cornerRadius);
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  } else {
    // 默认绘制矩形
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  ctx.globalAlpha = 1;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, bounds: any, radius: number) {
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;
  const r = Math.min(radius, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawTextElement(ctx: CanvasRenderingContext2D, element: any, bounds: any) {
  // 文本绘制为带浅色背景的矩形
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

  // 绘制文字指示器（横线）
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  const lineY = bounds.y + bounds.height / 2;
  ctx.beginPath();
  ctx.moveTo(bounds.x + 4, lineY);
  ctx.lineTo(bounds.x + bounds.width - 4, lineY);
  ctx.stroke();
}

function drawConnector(ctx: CanvasRenderingContext2D, connector: any) {
  try {
    // 获取连接线的路由点
    const routePoints = connector.getRoutePoints?.() || connector.getPoints?.();
    if (!routePoints || routePoints.length < 2) return;

    ctx.strokeStyle = normalizeColor(connector.stroke) || "#278bfe";
    ctx.lineWidth = Math.max(connector.strokeWidth || 2, 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 绘制路径
    ctx.beginPath();
    if (Array.isArray(routePoints)) {
      ctx.moveTo(routePoints[0].x, routePoints[0].y);
      for (let i = 1; i < routePoints.length; i++) {
        ctx.lineTo(routePoints[i].x, routePoints[i].y);
      }
    } else {
      // 如果是 from/to 格式
      const from = routePoints.from || routePoints[0];
      const to = routePoints.to || routePoints[1];
      if (from && to) {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
    }
    ctx.stroke();
  } catch {
    // 忽略绘制错误
  }
}

function drawPathElement(ctx: CanvasRenderingContext2D, element: any, bounds: any) {
  const path = element.path || "";
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;

  // 检测菱形（判断节点）
  if (path.includes("L") && !path.includes("Q") && !path.includes("A")) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + w, cy);
    ctx.lineTo(cx, y + h);
    ctx.lineTo(x, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  // 检测圆角矩形（带 Q 命令的路径）
  if (path.includes("Q") && path.includes("Z")) {
    const r = Math.min(w * 0.2, h * 0.2, 10);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  // 检测平行四边形（输入/输出）
  if (path.includes("L") && !path.includes("Q") && !path.includes("Z")) {
    const offset = Math.min(w * 0.15, 20);
    ctx.beginPath();
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - offset, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  // 检测圆柱体（数据库）
  if (path.includes("Q") && path.includes("M") && !path.includes("Z")) {
    const ry = Math.min(h * 0.15, 15);
    ctx.beginPath();
    // 顶部椭圆
    ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 侧面
    ctx.beginPath();
    ctx.moveTo(x, y + ry);
    ctx.lineTo(x, y + h - ry);
    ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, Math.PI, 0, true);
    ctx.lineTo(x + w, y + ry);
    ctx.fill();
    ctx.stroke();
    return;
  }

  // 默认绘制矩形
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function normalizeColor(color: any): string | null {
  if (!color) return null;
  if (typeof color === "string") {
    // 处理 rgba 格式
    if (color.startsWith("rgba")) return color;
    // 处理 hex 格式
    if (color.startsWith("#")) return color;
    // 处理 rgb 格式
    if (color.startsWith("rgb")) return color;
    // 处理命名颜色
    return color;
  }
  // 处理渐变对象
  if (color.type === "linear" || color.type === "radial") {
    // 渐变用第一个颜色停止点的颜色
    if (color.stops && color.stops.length > 0) {
      return color.stops[0].color || "#e2e8f0";
    }
  }
  if (color.value) return color.value;
  return null;
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
