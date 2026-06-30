<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ShapeLibraryGroup, ShapeLibraryItem } from "@/editor/shape-library";
import { getShapeLibrarySearchText, SHAPE_DROP_MIME } from "@/editor/shape-library";
import ShapeLibraryGroupView from "@/components/ShapeLibraryGroup.vue";
import ShapeLibraryItemView from "@/components/ShapeLibraryItem.vue";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";

const props = defineProps<{
  activeTool?: string;
  groups?: ShapeLibraryGroup[];
}>();

const emit = defineEmits<{
  tool: [tool: string];
}>();

const RECENT_SHAPES_KEY = "leafer-flow-recent-shapes";
const RECENT_SHAPES_LIMIT = 8;
const SHAPE_LIBRARY_COLLAPSED_KEY = "leafer-flow-shape-library-collapsed";
const SHAPE_LIBRARY_POSITION_KEY = "leafer-flow-shape-library-position";
const DEFAULT_PANEL_POSITION = { x: 12, y: 96 };
const PANEL_MARGIN = 8;
const SNAP_THRESHOLD = 16;

interface PanelPosition {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const query = ref("");
const collapsed = ref(false);
const recentTools = ref<string[]>([]);
const panelRef = ref<HTMLElement | null>(null);
const panelPosition = ref<PanelPosition>({ ...DEFAULT_PANEL_POSITION });
const dragging = ref(false);
let dragState: DragState | null = null;
let dragRafId: number | null = null;
let pendingDragPosition: PanelPosition | null = null;

const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("shape-library");
const isDocked = computed(() => mode.value !== "float");

const libraryGroups = computed(() => props.groups ?? []);
const allItems = computed(() => libraryGroups.value.flatMap((group) => group.items));
const itemMap = computed(() => new Map(allItems.value.map((item) => [item.tool, item])));
const recentItems = computed(() =>
  recentTools.value
    .map((tool) => itemMap.value.get(tool))
    .filter((item): item is ShapeLibraryItem => Boolean(item)),
);
const collapsedShortcutItems = computed(() => {
  const sourceTools =
    recentTools.value.length > 0 ? recentTools.value : allItems.value.map((item) => item.tool);
  return sourceTools
    .map((tool) => itemMap.value.get(tool))
    .filter((item): item is ShapeLibraryItem => Boolean(item))
    .slice(0, 5);
});

const displayGroups = computed<ShapeLibraryGroup[]>(() => {
  const groups = [...libraryGroups.value];
  if (recentItems.value.length > 0) {
    groups.unshift({ id: "recent", title: "最近使用", items: recentItems.value });
  }
  return groups;
});

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return displayGroups.value;

  return libraryGroups.value
    .map((group) => {
      const groupMatched = group.title.toLowerCase().includes(keyword);
      return {
        ...group,
        items: groupMatched
          ? group.items
          : group.items.filter((item) => getShapeLibrarySearchText(item).includes(keyword)),
      };
    })
    .filter((group) => group.items.length > 0);
});

const panelClass = computed(() => [
  "fixed z-20 rounded-lg border border-base-200 bg-base-100/95 shadow-xl backdrop-blur overflow-hidden transition-[width] duration-200 ease-out",
  dragging.value ? "select-none" : "",
  collapsed.value ? "w-14" : "w-64",
]);

const panelStyle = computed(() => ({
  left: `${panelPosition.value.x}px`,
  top: `${panelPosition.value.y}px`,
  height: collapsed.value ? "13.5rem" : "calc(100vh - 12rem)",
}));

onMounted(() => {
  loadCollapsedState();
  loadRecentTools();
  loadPanelPosition();
  window.addEventListener("resize", clampPanelToViewport);
});

onBeforeUnmount(() => {
  if (dragRafId !== null) {
    window.cancelAnimationFrame(dragRafId);
  }
  stopPanelDrag();
  window.removeEventListener("resize", clampPanelToViewport);
});

function handleSelect(item: ShapeLibraryItem) {
  rememberShape(item.tool);
  emit("tool", item.tool);
}

function handleDragStart(evt: DragEvent, item: ShapeLibraryItem) {
  if (!evt.dataTransfer) return;
  rememberShape(item.tool);
  evt.dataTransfer.effectAllowed = "copy";
  evt.dataTransfer.setData(SHAPE_DROP_MIME, JSON.stringify(item));
  evt.dataTransfer.setData("text/plain", item.tool);
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  saveCollapsedState();
  requestAnimationFrame(clampPanelToViewport);
}

function handlePanelDragStart(evt: PointerEvent) {
  if (evt.button !== 0) return;

  dragging.value = true;
  dragState = {
    pointerId: evt.pointerId,
    startX: evt.clientX,
    startY: evt.clientY,
    originX: panelPosition.value.x,
    originY: panelPosition.value.y,
  };

  window.addEventListener("pointermove", handlePanelDragMove);
  window.addEventListener("pointerup", handlePanelDragEnd);
  window.addEventListener("pointercancel", handlePanelDragEnd);
}

function handlePanelDragMove(evt: PointerEvent) {
  if (!dragState || evt.pointerId !== dragState.pointerId) return;

  pendingDragPosition = clampPanelPosition({
    x: dragState.originX + evt.clientX - dragState.startX,
    y: dragState.originY + evt.clientY - dragState.startY,
  });

  if (dragRafId === null) {
    dragRafId = window.requestAnimationFrame(() => {
      dragRafId = null;
      if (!pendingDragPosition) return;
      panelPosition.value = pendingDragPosition;
      pendingDragPosition = null;
    });
  }
}

function handlePanelDragEnd(evt: PointerEvent) {
  if (dragState && evt.pointerId !== dragState.pointerId) return;
  if (dragRafId !== null) {
    window.cancelAnimationFrame(dragRafId);
    dragRafId = null;
    if (pendingDragPosition) {
      panelPosition.value = pendingDragPosition;
      pendingDragPosition = null;
    }
  }
  stopPanelDrag();
  panelPosition.value = applyEdgeSnap(panelPosition.value);
  savePanelPosition();
}

function stopPanelDrag() {
  dragging.value = false;
  dragState = null;
  pendingDragPosition = null;
  window.removeEventListener("pointermove", handlePanelDragMove);
  window.removeEventListener("pointerup", handlePanelDragEnd);
  window.removeEventListener("pointercancel", handlePanelDragEnd);
}

function getPanelSize() {
  const rect = panelRef.value?.getBoundingClientRect();
  return {
    width: rect?.width ?? (collapsed.value ? 56 : 256),
    height: rect?.height ?? Math.max(window.innerHeight - 192, 120),
  };
}

function clampPanelPosition(position: PanelPosition): PanelPosition {
  const { width, height } = getPanelSize();
  const maxX = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);

  return {
    x: Math.min(Math.max(position.x, PANEL_MARGIN), maxX),
    y: Math.min(Math.max(position.y, PANEL_MARGIN), maxY),
  };
}

function clampPanelToViewport() {
  panelPosition.value = clampPanelPosition(panelPosition.value);
  savePanelPosition();
}

function applyEdgeSnap(position: PanelPosition): PanelPosition {
  const clamped = clampPanelPosition(position);
  const { width, height } = getPanelSize();
  const maxX = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);

  let nextX = clamped.x;
  let nextY = clamped.y;

  if (Math.abs(nextX - PANEL_MARGIN) <= SNAP_THRESHOLD) nextX = PANEL_MARGIN;
  if (Math.abs(nextX - maxX) <= SNAP_THRESHOLD) nextX = maxX;
  if (Math.abs(nextY - PANEL_MARGIN) <= SNAP_THRESHOLD) nextY = PANEL_MARGIN;
  if (Math.abs(nextY - maxY) <= SNAP_THRESHOLD) nextY = maxY;

  return { x: nextX, y: nextY };
}

function loadPanelPosition() {
  try {
    const raw = localStorage.getItem(SHAPE_LIBRARY_POSITION_KEY);
    if (!raw) {
      panelPosition.value = clampPanelPosition(DEFAULT_PANEL_POSITION);
      return;
    }

    const position = JSON.parse(raw) as Partial<PanelPosition>;
    if (typeof position.x !== "number" || typeof position.y !== "number") return;
    panelPosition.value = clampPanelPosition({ x: position.x, y: position.y });
  } catch (error) {
    console.warn("读取图形库位置失败", error);
  }
}

function savePanelPosition() {
  try {
    localStorage.setItem(SHAPE_LIBRARY_POSITION_KEY, JSON.stringify(panelPosition.value));
  } catch (error) {
    console.warn("保存图形库位置失败", error);
  }
}

function loadCollapsedState() {
  try {
    collapsed.value = localStorage.getItem(SHAPE_LIBRARY_COLLAPSED_KEY) === "true";
  } catch (error) {
    console.warn("读取图形库折叠状态失败", error);
  }
}

function saveCollapsedState() {
  try {
    localStorage.setItem(SHAPE_LIBRARY_COLLAPSED_KEY, String(collapsed.value));
  } catch (error) {
    console.warn("保存图形库折叠状态失败", error);
  }
}

function loadRecentTools() {
  try {
    const raw = localStorage.getItem(RECENT_SHAPES_KEY);
    if (!raw) return;

    const tools = JSON.parse(raw) as string[];
    if (!Array.isArray(tools)) return;
    recentTools.value = tools.filter(isKnownTool).slice(0, RECENT_SHAPES_LIMIT);
  } catch (error) {
    console.warn("读取最近使用图形失败", error);
  }
}

function isKnownTool(tool: string) {
  return itemMap.value.has(tool);
}

function rememberShape(tool: string) {
  recentTools.value = [tool, ...recentTools.value.filter((item) => item !== tool)].slice(
    0,
    RECENT_SHAPES_LIMIT,
  );

  try {
    localStorage.setItem(RECENT_SHAPES_KEY, JSON.stringify(recentTools.value));
  } catch (error) {
    console.warn("保存最近使用图形失败", error);
  }
}
</script>

<template>
  <aside v-if="mode === 'float'" ref="panelRef" :class="panelClass" :style="panelStyle">
    <div class="flex touch-none items-center border-b border-base-200"
      :class="collapsed ? 'justify-between px-1.5 py-1.5' : 'cursor-move justify-between px-3 py-2'" title="拖动面板"
      @pointerdown="!collapsed ? handlePanelDragStart : undefined">
      <button v-if="collapsed" class="btn btn-ghost btn-xs btn-square cursor-move" title="拖动图形库面板"
        @pointerdown="handlePanelDragStart">
        <Icon name="layer" class="h-3.5 w-3.5 opacity-75" />
      </button>

      <div v-else class="flex items-center gap-1.5 text-sm font-semibold">
        <Icon name="template" class="h-4 w-4 opacity-75" />
        <span>图形库</span>
      </div>

      <div class="flex items-center gap-0.5">
        <button class="btn btn-xs btn-ghost btn-square" title="收纳到右侧槽" @click="togglePanelDock('shape-library')"
          @pointerdown.stop>
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-xs btn-ghost" @click="toggleCollapsed" @pointerdown.stop
          :title="collapsed ? '展开图形库' : '折叠图形库'">
          {{ collapsed ? "›" : "‹" }}
        </button>
      </div>
    </div>

    <div v-if="collapsed" class="flex h-[calc(100%-2.5rem)] flex-col items-center gap-1.5 p-1.5">
      <div
        class="flex w-full flex-col items-center gap-1 rounded-md border border-base-200/80 bg-base-200/30 px-1 py-1.5 text-[10px] text-base-content/70">
        <Icon name="template" class="h-4 w-4 opacity-80" />
        <span class="[writing-mode:vertical-rl] font-medium tracking-[0.2em]">图形库</span>
      </div>

      <div class="w-full rounded-sm bg-base-200/40 py-1 text-center text-[9px] tracking-wide text-base-content/55">
        最近
      </div>

      <div v-if="collapsedShortcutItems.length > 0" class="flex w-full flex-1 flex-col gap-1 overflow-y-auto pr-0.5"
        title="点击或拖拽最近图形">
        <ShapeLibraryItemView v-for="item in collapsedShortcutItems" :key="item.tool" compact :item="item"
          :active="activeTool === item.tool" @select="handleSelect" @drag-start="handleDragStart" />
      </div>

      <div v-else class="flex w-full flex-1 items-center justify-center text-[10px] text-base-content/45">
        最近为空
      </div>
    </div>

    <div v-else class="flex h-[calc(100%-2.5rem)] flex-col">
      <div class="p-2">
        <input v-model="query" class="input input-bordered input-xs w-full" type="search"
          placeholder="搜索图形、BPMN、架构..." />
      </div>

      <p class="px-2 pb-2 text-[11px] leading-relaxed text-base-content/50">
        拖拽创建，点击进入连续绘制模式
      </p>

      <div class="flex-1 overflow-y-auto px-2 pb-3">
        <ShapeLibraryGroupView v-for="group in filteredGroups" :key="group.id" :group="group" :active-tool="activeTool"
          @select="handleSelect" @drag-start="handleDragStart" />

        <div v-if="filteredGroups.length === 0" class="py-8 text-center text-xs text-base-content/50">
          未找到匹配图形
        </div>
      </div>
    </div>
  </aside>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="shape-library" title="图形库" icon="template" :width="256">
    <div class="flex flex-col">
      <div class="p-2">
        <input v-model="query" class="input input-bordered input-xs w-full" type="search"
          placeholder="搜索图形、BPMN、架构..." />
      </div>
      <p class="px-2 pb-2 text-[11px] leading-relaxed text-base-content/50">
        拖拽创建，点击进入连续绘制模式
      </p>
      <div class="overflow-y-auto px-2 pb-3" style="max-height: calc(100vh - 14rem)">
        <ShapeLibraryGroupView v-for="group in filteredGroups" :key="group.id" :group="group" :active-tool="activeTool"
          @select="handleSelect" @drag-start="handleDragStart" />
        <div v-if="filteredGroups.length === 0" class="py-8 text-center text-xs text-base-content/50">
          未找到匹配图形
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
