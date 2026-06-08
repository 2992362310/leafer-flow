<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ShapeLibraryGroup, ShapeLibraryItem } from "../editor/shape-library";
import { TOOL_NAME, type ToolName } from "../editor/constants";
import {
  getShapeLibrarySearchText,
  shapeLibraryGroups,
  SHAPE_DROP_MIME,
} from "../editor/shape-library";
import Icon from "./Icon.vue";

const props = defineProps<{
  activeTool?: string;
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
const DEFAULT_COLLAPSED_TOOLS: ToolName[] = [
  TOOL_NAME.DRAW_RECT,
  TOOL_NAME.DRAW_CIRCLE,
  TOOL_NAME.DRAW_DIAMOND,
  TOOL_NAME.DRAW_TEXT,
  TOOL_NAME.FLOW_PROCESS,
];

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
const recentTools = ref<ToolName[]>([]);
const panelRef = ref<HTMLElement | null>(null);
const panelPosition = ref<PanelPosition>({ ...DEFAULT_PANEL_POSITION });
const dragging = ref(false);
let dragState: DragState | null = null;

const allItems = computed(() => shapeLibraryGroups.flatMap((group) => group.items));
const itemMap = computed(() => new Map(allItems.value.map((item) => [item.tool, item])));
const recentItems = computed(() =>
  recentTools.value
    .map((tool) => itemMap.value.get(tool))
    .filter((item): item is ShapeLibraryItem => Boolean(item)),
);
const collapsedShortcutItems = computed(() => {
  const sourceTools = recentTools.value.length > 0 ? recentTools.value : DEFAULT_COLLAPSED_TOOLS;
  return sourceTools
    .map((tool) => itemMap.value.get(tool))
    .filter((item): item is ShapeLibraryItem => Boolean(item))
    .slice(0, 5);
});

const displayGroups = computed<ShapeLibraryGroup[]>(() => {
  const groups = [...shapeLibraryGroups];
  if (recentItems.value.length > 0) {
    groups.unshift({ id: "recent", title: "最近使用", items: recentItems.value });
  }
  return groups;
});

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return displayGroups.value;

  return shapeLibraryGroups
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
  collapsed.value ? "w-12" : "w-64",
]);

const panelStyle = computed(() => ({
  left: `${panelPosition.value.x}px`,
  top: `${panelPosition.value.y}px`,
  height: "calc(100vh - 12rem)",
}));

onMounted(() => {
  loadCollapsedState();
  loadRecentTools();
  loadPanelPosition();
  window.addEventListener("resize", clampPanelToViewport);
});

onBeforeUnmount(() => {
  stopPanelDrag();
  window.removeEventListener("resize", clampPanelToViewport);
});

function getItemButtonClass(item: ShapeLibraryItem, compact = false) {
  return [
    "btn",
    compact ? "btn-xs h-8 w-8 p-0" : "h-16 flex-col gap-1 px-1 text-xs",
    props.activeTool === item.tool ? "btn-primary" : "btn-ghost",
  ];
}

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

  const nextPosition = clampPanelPosition({
    x: dragState.originX + evt.clientX - dragState.startX,
    y: dragState.originY + evt.clientY - dragState.startY,
  });
  panelPosition.value = nextPosition;
}

function handlePanelDragEnd(evt: PointerEvent) {
  if (dragState && evt.pointerId !== dragState.pointerId) return;
  stopPanelDrag();
  savePanelPosition();
}

function stopPanelDrag() {
  dragging.value = false;
  dragState = null;
  window.removeEventListener("pointermove", handlePanelDragMove);
  window.removeEventListener("pointerup", handlePanelDragEnd);
  window.removeEventListener("pointercancel", handlePanelDragEnd);
}

function getPanelSize() {
  const rect = panelRef.value?.getBoundingClientRect();
  return {
    width: rect?.width ?? (collapsed.value ? 48 : 256),
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
    recentTools.value = tools
      .filter((tool): tool is ToolName => isKnownTool(tool))
      .slice(0, RECENT_SHAPES_LIMIT);
  } catch (error) {
    console.warn("读取最近使用图形失败", error);
  }
}

function isKnownTool(tool: string): tool is ToolName {
  return itemMap.value.has(tool as ToolName);
}

function rememberShape(tool: ToolName) {
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
  <aside ref="panelRef" :class="panelClass" :style="panelStyle">
    <div
      class="flex cursor-move touch-none items-center border-b border-base-200 px-3 py-2"
      :class="collapsed ? 'justify-center px-1' : 'justify-between'"
      title="拖动面板"
      @pointerdown="handlePanelDragStart"
    >
      <div v-show="!collapsed" class="text-sm font-semibold">图形库</div>
      <button
        class="btn btn-xs btn-ghost"
        @click="toggleCollapsed"
        @pointerdown.stop
        :title="collapsed ? '展开图形库' : '折叠图形库'"
      >
        {{ collapsed ? "›" : "‹" }}
      </button>
    </div>

    <div v-if="collapsed" class="flex h-[calc(100%-2.5rem)] flex-col items-center gap-2 px-1 py-2">
      <button
        class="btn btn-ghost btn-xs h-auto min-h-0 flex-col gap-1 px-1 py-2 text-[10px] leading-tight"
        title="展开图形库"
        @click="toggleCollapsed"
        @pointerdown.stop
      >
        <span class="text-base">▦</span>
        <span class="[writing-mode:vertical-rl] tracking-widest">图形库</span>
      </button>

      <div
        v-if="collapsedShortcutItems.length > 0"
        class="mt-2 flex flex-col gap-1 border-t border-base-200 pt-2"
      >
        <button
          v-for="item in collapsedShortcutItems"
          :key="item.tool"
          draggable="true"
          :class="getItemButtonClass(item, true)"
          :title="`${item.label}：拖拽到画布或点击选择工具`"
          @click="handleSelect(item)"
          @dragstart="handleDragStart($event, item)"
        >
          <Icon :name="item.icon" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-else class="flex h-[calc(100%-2.5rem)] flex-col">
      <div class="p-2">
        <input
          v-model="query"
          class="input input-bordered input-xs w-full"
          type="search"
          placeholder="搜索图形、BPMN、架构..."
        />
      </div>

      <p class="px-2 pb-2 text-[11px] leading-relaxed text-base-content/50">
        拖拽创建，点击进入连续绘制模式
      </p>

      <div class="flex-1 overflow-y-auto px-2 pb-3">
        <section v-for="group in filteredGroups" :key="group.id" class="mb-3">
          <div
            class="sticky top-0 z-10 bg-base-100/95 py-1 text-[11px] font-semibold text-base-content/60"
          >
            {{ group.title }}
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="item in group.items"
              :key="`${group.id}-${item.tool}`"
              draggable="true"
              :class="getItemButtonClass(item)"
              :title="`${item.label}：拖拽到画布或点击选择工具`"
              @click="handleSelect(item)"
              @dragstart="handleDragStart($event, item)"
            >
              <Icon :name="item.icon" class="h-5 w-5" />
              <span class="max-w-full truncate">{{ item.label }}</span>
            </button>
          </div>
        </section>

        <div
          v-if="filteredGroups.length === 0"
          class="py-8 text-center text-xs text-base-content/50"
        >
          未找到匹配图形
        </div>
      </div>
    </div>
  </aside>
</template>
