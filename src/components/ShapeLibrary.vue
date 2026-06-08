<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ShapeLibraryGroup, ShapeLibraryItem } from "../editor/shape-library";
import type { ToolName } from "../editor/constants";
import {
  getShapeLibrarySearchText,
  shapeLibraryGroups,
  SHAPE_DROP_MIME,
} from "../editor/shape-library";
import Icon from "./Icon.vue";

const emit = defineEmits<{
  tool: [tool: string];
}>();

const RECENT_SHAPES_KEY = "leafer-flow-recent-shapes";
const RECENT_SHAPES_LIMIT = 8;
const SHAPE_LIBRARY_COLLAPSED_KEY = "leafer-flow-shape-library-collapsed";

const query = ref("");
const collapsed = ref(false);
const recentTools = ref<ToolName[]>([]);

const allItems = computed(() => shapeLibraryGroups.flatMap((group) => group.items));
const itemMap = computed(() => new Map(allItems.value.map((item) => [item.tool, item])));
const recentItems = computed(() =>
  recentTools.value
    .map((tool) => itemMap.value.get(tool))
    .filter((item): item is ShapeLibraryItem => Boolean(item)),
);

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

  return displayGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => getShapeLibrarySearchText(item).includes(keyword)),
    }))
    .filter((group) => group.items.length > 0);
});

const panelClass = computed(() => [
  "fixed left-3 top-24 bottom-24 z-20 rounded-lg border border-base-200 bg-base-100/95 shadow-xl backdrop-blur overflow-hidden transition-[width] duration-200 ease-out",
  collapsed.value ? "w-12" : "w-64",
]);

onMounted(() => {
  loadCollapsedState();
  loadRecentTools();
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
  <aside :class="panelClass">
    <div
      class="flex items-center border-b border-base-200 px-3 py-2"
      :class="collapsed ? 'justify-center px-1' : 'justify-between'"
    >
      <div v-show="!collapsed" class="text-sm font-semibold">图形库</div>
      <button
        class="btn btn-xs btn-ghost"
        @click="toggleCollapsed"
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
      >
        <span class="text-base">▦</span>
        <span class="[writing-mode:vertical-rl] tracking-widest">图形库</span>
      </button>

      <div
        v-if="recentItems.length > 0"
        class="mt-2 flex flex-col gap-1 border-t border-base-200 pt-2"
      >
        <button
          v-for="item in recentItems.slice(0, 5)"
          :key="item.tool"
          draggable="true"
          class="btn btn-ghost btn-xs h-8 w-8 p-0"
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
              class="btn btn-ghost h-16 flex-col gap-1 px-1 text-xs"
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
