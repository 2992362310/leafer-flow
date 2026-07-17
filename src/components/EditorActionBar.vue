<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import EditorButton from "@/components/EditorButton.vue";
import type { Editor } from "@/editor";
import type { PanelToggleId } from "@/editor/api/panel-toggle";
import { useCollapsible, useDraggable } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import { useInjectedPageCommands, useInjectedPanelVisibility } from "@/views/editor-page/lib";
import { isPagePanelId } from "@/views/editor-page/lib/panels";

const ACTION_BAR_POSITION_KEY = "leafer-flow-action-bar-position";

const props = defineProps<{
  editor?: Editor;
}>();

const { handleAction } = useInjectedPageCommands();
const panelVisibility = useInjectedPanelVisibility();
const { isPanelDocked } = usePanelDock();

const actionButtonGroups = computed(() => props.editor?.actionButtons.list() ?? []);
const editGroups = computed(() =>
  actionButtonGroups.value.filter((group) => (group.surface ?? "edit") === "edit"),
);
const panelGroups = computed(() =>
  actionButtonGroups.value.filter((group) => group.surface === "panel"),
);

/** Panels that are float-open, flyout-open, or docked to the rail. */
const activePanelIds = computed(() => {
  const ids = new Set<string>();
  for (const group of panelGroups.value) {
    for (const item of group.items) {
      const panelId = item.panelId as PanelToggleId | undefined;
      if (!panelId) continue;
      if (isPagePanelId(panelId) && panelVisibility.isMounted(panelId)) {
        ids.add(panelId);
        continue;
      }
      if (isPanelDocked(panelId)) ids.add(panelId);
    }
  }
  return ids;
});

const router = useRouter();

async function openPluginMarket() {
  if (!props.editor) {
    void router.push("/plugin-market");
    return;
  }
  await handleAction("togglePluginMarket");
}

function openTemplateMarket() {
  void router.push("/template-market");
}

const { position, isDragging, startDrag } = useDraggable({
  initialX: 430,
  initialY: 88,
  onDragEnd: savePosition,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
const { togglePanelDock, undockPanel } = usePanelDock();
const mode = usePanelMode("action-bar");

onMounted(() => {
  try {
    const raw = localStorage.getItem(ACTION_BAR_POSITION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof saved.x === "number" && typeof saved.y === "number") {
      position.value = { x: saved.x, y: saved.y };
    }
  } catch (error) {
    console.warn("读取操作工具条位置失败", error);
  }
});

function savePosition(next: { x: number; y: number }) {
  try {
    localStorage.setItem(ACTION_BAR_POSITION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("保存操作工具条位置失败", error);
  }
}
</script>

<template>
  <div
    v-if="mode === 'float' || mode === 'flyout'"
    class="fixed rounded-2xl border border-base-200/80 bg-base-100/95 shadow-xl backdrop-blur"
    :class="mode === 'flyout' ? 'z-40 w-72' : 'z-20'"
    :style="
      mode === 'float'
        ? { left: `${position.x}px`, top: `${position.y}px` }
        : { right: '3.25rem', top: '4rem' }
    "
    @click.stop
  >
    <div
      class="flex items-center justify-between gap-2 border-b border-base-200/80 px-4 py-3 select-none"
      :class="mode === 'float' ? 'cursor-move' : undefined"
      @mousedown="mode === 'float' ? startDrag($event) : undefined"
    >
      <div class="flex items-center gap-2.5">
        <span
          class="inline-flex items-center justify-center rounded-lg bg-base-200 text-base-content/80"
          :class="mode === 'float' ? 'h-8 w-8' : 'h-7 w-7'"
        >
          <Icon name="toolbar" :class="mode === 'float' ? 'h-4 w-4' : 'h-3.5 w-3.5'" />
        </span>
        <div v-if="mode === 'float'">
          <div class="text-sm font-semibold leading-5">操作工具</div>
          <div class="text-[11px] text-base-content/60">拖动面板或折叠，常用操作集中在这里</div>
        </div>
        <span v-else class="text-sm font-semibold">操作工具</span>
      </div>

      <div v-if="mode === 'float'" class="flex items-center gap-0.5">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('action-bar')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="toggleCollapse(isDragging)"
          @mousedown.stop
        >
          <Icon :name="isCollapsed ? 'arrow-down' : 'arrow-up'" class="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        v-else
        class="btn btn-ghost btn-xs gap-1"
        title="移出槽位，恢复浮动"
        @click="undockPanel('action-bar')"
      >
        <Icon name="arrow-up" class="h-3 w-3 -rotate-90" />
        移出
      </button>
    </div>

    <div v-show="mode === 'flyout' || !isCollapsed" class="p-3">
      <div class="mb-3 rounded-xl border border-base-200/80 bg-base-200/35 p-2.5">
        <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">
          市场入口
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm h-9 min-w-20" @click="openPluginMarket">
            <Icon name="agent" class="h-4 w-4" />插件
          </button>
          <button class="btn btn-sm h-9 min-w-20" @click="openTemplateMarket">
            <Icon name="toolbar" class="h-4 w-4" />模板
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-base-200/80 bg-base-100 p-2.5">
        <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">
          编辑
        </div>
        <EditorButton :groups="editGroups" :columns="8" @action="handleAction" />

        <div
          v-if="panelGroups.length"
          class="mt-3 mb-2 text-[11px] font-semibold tracking-wide text-base-content/55"
        >
          面板
        </div>
        <EditorButton
          v-if="panelGroups.length"
          :groups="panelGroups"
          :columns="8"
          :active-panel-ids="activePanelIds"
          tooltip-placement="top"
          @action="handleAction"
        />
      </div>
    </div>
  </div>
</template>
