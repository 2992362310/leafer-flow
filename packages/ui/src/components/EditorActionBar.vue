<script setup lang="ts">
import { computed, onMounted } from "vue";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import EditorActionBarContent from "./EditorActionBarContent.vue";
import type { Editor } from "@leafer-flow/core";
import type { ActionButtonGroupContribution, ActionButtonSurface } from "@leafer-flow/core/api/action-button";
import type { PanelToggleId } from "@leafer-flow/core/api/panel-toggle";
import { useCollapsible, useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import { useInjectedPageCommands, useInjectedPanelVisibility } from "../context";
import FloatingPanelShell from "./FloatingPanelShell.vue";

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
      if (panelVisibility.has(panelId) && panelVisibility.isMounted(panelId)) {
        ids.add(panelId);
        continue;
      }
      if (isPanelDocked(panelId)) ids.add(panelId);
    }
  }
  return ids;
});

const { position, isDragging, hasMoved, startDrag } = useDraggable({
  initialX: Math.max(16, window.innerWidth - 368),
  initialY: 72,
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
    <FloatingPanelShell v-if="!isCollapsed && mode === 'float'" title="操作工具" icon="toolbar" :position="position"
      :width="320" max-height="min(68vh, 38rem)" @drag-start="startDrag">
      <template #actions>
        <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('action-bar')">
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="折叠" @click.stop="toggleCollapse(isDragging || hasMoved)">
          <Icon name="arrow-down" class="h-3.5 w-3.5" />
        </button>
      </template>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <EditorActionBarContent :sections="sections" :active-panel-ids="activePanelIds" @action="handleAction"
          @open-plugin-market="emit('openPluginMarket')" @open-template-market="emit('openTemplateMarket')" />
      </div>
    </FloatingPanelShell>
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
    <div class="p-3">
      <EditorActionBarContent :sections="sections" :active-panel-ids="activePanelIds" @action="handleAction"
        @open-plugin-market="emit('openPluginMarket')" @open-template-market="emit('openTemplateMarket')" />
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
