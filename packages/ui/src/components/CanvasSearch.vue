<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { IUI } from "leafer";
import type { Editor } from "@leafer-flow/core";
import { Text } from "leafer";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";

const props = defineProps<{
  editor: Editor;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const query = ref("");
const results = ref<IUI[]>([]);
const selectedIndex = ref(-1);
const inputRef = ref<HTMLInputElement>();
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("canvas-search");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth / 2 - 160, 8),
  initialY: 72,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 320,
  panelHeight: 360,
  margin: 8,
});

watch(
  () => props.open || mode.value === "flyout",
  async (isOpen) => {
    if (isOpen) {
      query.value = "";
      results.value = [];
      selectedIndex.value = -1;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

function search() {
  const q = query.value.trim().toLowerCase();
  if (!q) {
    results.value = [];
    return;
  }

  const tree = props.editor.app.tree;
  const matches: IUI[] = [];

  function walk(children: IUI[]) {
    for (const child of children) {
      const tag = String(child.tag || "").toLowerCase();
      const name = String(child.name || "").toLowerCase();
      const text = getInnerText(child).toLowerCase();

      if (tag.includes(q) || name.includes(q) || text.includes(q)) {
        matches.push(child);
      }

      const childChildren = (child as unknown as { children?: IUI[] }).children;
      if (childChildren?.length) walk(childChildren as IUI[]);
    }
  }

  walk(tree.children as IUI[]);
  results.value = matches;
  selectedIndex.value = matches.length > 0 ? 0 : -1;
}

function getInnerText(el: IUI): string {
  if (el instanceof Text) return String(el.text || "");
  if (typeof (el as unknown as Record<string, unknown>).text === "string") {
    return String((el as unknown as Record<string, unknown>).text);
  }
  const children = (el as unknown as { children?: IUI[] }).children;
  if (children) {
    for (const child of children) {
      if (child instanceof Text) return String(child.text || "");
    }
  }
  return "";
}

function selectResult(index: number) {
  selectedIndex.value = index;
  const el = results.value[index];
  if (!el) return;

  props.editor.app.editor.select(el);

  const bounds = el.getBounds("box", "world");
  if (bounds) {
    const app = props.editor.app;
    const viewWidth = (app.view as HTMLElement)?.clientWidth || 800;
    const viewHeight = (app.view as HTMLElement)?.clientHeight || 600;
    const scale = app.tree.scaleX || 1;

    app.tree.x = viewWidth / 2 - (bounds.x + bounds.width / 2) * scale;
    app.tree.y = viewHeight / 2 - (bounds.y + bounds.height / 2) * scale;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  if (e.key === "Enter") {
    if (results.value.length > 0 && selectedIndex.value >= 0) {
      selectResult(selectedIndex.value);
    }
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (results.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
    }
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (results.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + results.value.length) % results.value.length;
    }
  }
}

function getElementLabel(el: IUI): string {
  if (el.name) return el.name;
  const text = getInnerText(el);
  if (text) return text.slice(0, 30);
  return el.tag || "未知";
}
</script>

<template>
  <div
    v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-80"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <Icon name="select" class="h-4 w-4" />
        <span class="text-xs font-bold">搜索</span>
      </div>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('canvas-search')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="emit('close')" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div class="p-3">
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        placeholder="搜索元素..."
        class="input input-sm input-bordered w-full mb-2"
        @input="search"
        @keydown="handleKeydown"
      />

      <div v-if="results.length > 0" class="max-h-60 overflow-y-auto space-y-1">
        <div
          v-for="(el, index) in results"
          :key="index"
          class="flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-base-200"
          :class="{ 'bg-primary/10': index === selectedIndex }"
          @click="selectResult(index)"
        >
          <span class="badge badge-xs badge-ghost">{{ el.tag }}</span>
          <span class="flex-1 truncate">{{ getElementLabel(el) }}</span>
          <span class="text-[10px] opacity-50">
            ({{ Math.round(el.x || 0) }}, {{ Math.round(el.y || 0) }})
          </span>
        </div>
      </div>

      <div v-else-if="query.trim()" class="text-xs opacity-50 text-center py-2">未找到匹配元素</div>
    </div>
  </div>

  <PanelFlyoutWrapper
    v-else-if="mode === 'flyout'"
    panel-id="canvas-search"
    title="搜索"
    icon="select"
    :width="320"
  >
    <div class="p-3">
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        placeholder="搜索元素..."
        class="input input-sm input-bordered w-full mb-2"
        @input="search"
        @keydown="handleKeydown"
      />
      <div v-if="results.length > 0" class="max-h-60 overflow-y-auto space-y-1">
        <div
          v-for="(el, index) in results"
          :key="index"
          class="flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-base-200"
          :class="{ 'bg-primary/10': index === selectedIndex }"
          @click="selectResult(index)"
        >
          <span class="badge badge-xs badge-ghost">{{ el.tag }}</span>
          <span class="flex-1 truncate">{{ getElementLabel(el) }}</span>
          <span class="text-[10px] opacity-50">
            ({{ Math.round(el.x || 0) }}, {{ Math.round(el.y || 0) }})
          </span>
        </div>
      </div>
      <div v-else-if="query.trim()" class="text-xs opacity-50 text-center py-2">未找到匹配元素</div>
    </div>
  </PanelFlyoutWrapper>
</template>
