<script setup lang="ts">
import { computed, onMounted } from "vue";
import EditorButton from "./EditorButton.vue";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import type { Editor } from "@leafer-flow/editor-engine";
import type { ActionButtonGroupContribution, ActionButtonSurface } from "@leafer-flow/editor-engine/api/action-button";
import type { PanelToggleId } from "@leafer-flow/editor-engine/api/panel-toggle";
import { useCollapsible, useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import { useInjectedPageCommands, useInjectedPanelVisibility } from "../context";
import { isPagePanelId } from "../context/panels";

const ACTION_BAR_POSITION_KEY = "leafer-flow-action-bar-position";

const SECTION_DEFS: Array<{ id: ActionButtonSurface; label: string }> = [
  { id: "file", label: "文件" },
  { id: "edit", label: "编辑" },
  { id: "arrange", label: "排版" },
  { id: "panel", label: "面板" },
];

const props = defineProps<{
  editor?: Editor;
}>();

const emit = defineEmits<{
  openPluginMarket: [];
  openTemplateMarket: [];
}>();

const { handleAction } = useInjectedPageCommands();
const panelVisibility = useInjectedPanelVisibility();
const { isPanelDocked, togglePanelDock } = usePanelDock();

const actionButtonGroups = computed(() => props.editor?.actionButtons.list() ?? []);

const sections = computed(() =>
  SECTION_DEFS.map((def) => ({
    ...def,
    groups: actionButtonGroups.value.filter(
      (group) => (group.surface ?? "edit") === def.id,
    ) as ActionButtonGroupContribution[],
  })).filter((section) => section.groups.length > 0),
);

/** Panels that are float-open, flyout-open, or docked to the rail. */
const activePanelIds = computed(() => {
  const ids = new Set<string>();
  for (const group of actionButtonGroups.value) {
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

const { position, isDragging, hasMoved, startDrag } = useDraggable({
  initialX: 430,
  initialY: 88,
  onDragEnd: savePosition,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
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
  <!-- 浮动展开：与 AI 助手一致的卡片交互 -->
  <Transition name="slide-fade">
    <div v-if="!isCollapsed && mode === 'float'"
      class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-80"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }" @click.stop>
      <div class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
        @mousedown="startDrag">
        <div class="flex items-center gap-2">
          <Icon name="toolbar" class="h-4 w-4" />
          <span class="text-xs font-bold">操作工具</span>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('action-bar')"
            @mousedown.stop>
            <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
          </button>
          <button class="btn btn-ghost btn-xs btn-square" title="折叠"
            @click.stop="toggleCollapse(isDragging || hasMoved)" @mousedown.stop>
            <Icon name="arrow-down" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="p-3 space-y-3">
        <div class="rounded-xl border border-base-200/80 bg-base-200/35 p-2.5">
          <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">市场</div>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-sm h-9 min-w-20" @click="emit('openPluginMarket')">
              <Icon name="agent" class="h-4 w-4" />插件
            </button>
            <button class="btn btn-sm h-9 min-w-20" @click="emit('openTemplateMarket')">
              <Icon name="template" class="h-4 w-4" />模板
            </button>
          </div>
        </div>

        <div v-for="section in sections" :key="section.id"
          class="rounded-xl border border-base-200/80 bg-base-100 p-2.5">
          <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">
            {{ section.label }}
          </div>
          <EditorButton :groups="section.groups" :columns="5" :active-panel-ids="activePanelIds"
            :tooltip-placement="section.id === 'panel' ? 'top' : 'bottom'" @action="handleAction" />
        </div>
      </div>
    </div>
  </Transition>

  <!-- 折叠为浮动按钮（与 AI 助手一致） -->
  <Transition name="slide-fade">
    <button v-if="isCollapsed && mode === 'float'" class="btn btn-sm fixed z-20 shadow-lg cursor-move"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }" @mousedown="startDrag"
      @click="toggleCollapse(hasMoved)">
      <Icon name="toolbar" class="h-4 w-4" />
      操作工具
    </button>
  </Transition>

  <!-- 右侧槽 flyout：共用 PanelFlyoutWrapper -->
  <PanelFlyoutWrapper v-if="mode === 'flyout'" panel-id="action-bar" title="操作工具" icon="toolbar" :width="320">
    <div class="p-3 space-y-3">
      <div class="rounded-xl border border-base-200/80 bg-base-200/35 p-2.5">
        <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">市场</div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm h-9 min-w-20" @click="emit('openPluginMarket')">
            <Icon name="agent" class="h-4 w-4" />插件
          </button>
          <button class="btn btn-sm h-9 min-w-20" @click="emit('openTemplateMarket')">
            <Icon name="template" class="h-4 w-4" />模板
          </button>
        </div>
      </div>

      <div v-for="section in sections" :key="`flyout-${section.id}`"
        class="rounded-xl border border-base-200/80 bg-base-100 p-2.5">
        <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">
          {{ section.label }}
        </div>
        <EditorButton :groups="section.groups" :columns="5" :active-panel-ids="activePanelIds"
          :tooltip-placement="section.id === 'panel' ? 'top' : 'bottom'" @action="handleAction" />
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(16px);
  opacity: 0;
}
</style>
