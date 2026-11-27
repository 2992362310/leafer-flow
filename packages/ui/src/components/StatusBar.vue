<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import FloatingPanelShell from "./FloatingPanelShell.vue";

const STATUS_BAR_POSITION_KEY = "leafer-flow-status-bar-position";

const props = defineProps<{
  selectedTool?: string | null;
  toolLabels?: Record<string, string>;
  isDrawing?: boolean;
  elementCount?: number;
}>();

const { position, startDrag } = useDraggable({
  initialX: 32,
  initialY: window.innerHeight - 180,
  onDragEnd: savePosition,
});
const isCollapsed = ref(false);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("status-bar");

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STATUS_BAR_POSITION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof saved.x === "number" && typeof saved.y === "number") {
      position.value = { x: saved.x, y: saved.y };
    }
  } catch (error) {
    console.warn("读取状态信息面板位置失败", error);
  }
});

function savePosition(next: { x: number; y: number }) {
  try {
    localStorage.setItem(STATUS_BAR_POSITION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("保存状态信息面板位置失败", error);
  }
}

const currentToolName = computed(() => {
  if (!props.selectedTool) return "无";
  return props.toolLabels?.[props.selectedTool] ?? props.selectedTool;
});

const isSelectMode = computed(() => !props.selectedTool || props.selectedTool === TOOL_NAME.SELECT);
const toolStatus = computed(() =>
  isSelectMode.value ? "选择模式：点击元素可选中并编辑" : "绘制模式：点击或拖拽画布创建元素",
);
const statusClass = computed(() => (isSelectMode.value ? "alert-success" : "alert-info"));
</script>

<template>
  <FloatingPanelShell v-if="mode === 'float'" title="状态信息" icon="info" :position="position" :width="256"
    max-height="min(40vh, 20rem)" @drag-start="startDrag">
    <template #actions>
      <button type="button" @click.stop="togglePanelDock('status-bar')" class="btn btn-xs btn-ghost btn-square"
        title="收纳到右侧槽" aria-label="收纳状态信息到右侧槽">
        <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
      </button>
      <button type="button" @click.stop="toggleCollapse()" class="btn btn-xs btn-ghost btn-square"
        :title="isCollapsed ? '展开状态' : '折叠状态'" :aria-label="isCollapsed ? '展开状态' : '折叠状态'"
        :aria-expanded="!isCollapsed">
        <Icon :name="isCollapsed ? 'arrow-up' : 'arrow-down'" class="h-3 w-3" />
      </button>
    </template>

    <div v-show="!isCollapsed" class="space-y-2 p-3 pt-2 text-xs" @click.stop>
      <div v-if="elementCount !== undefined">
        <div class="badge badge-ghost text-xs">元素总数：{{ elementCount }}</div>
      </div>

      <div>
        <div class="badge badge-neutral text-xs">当前工具：{{ currentToolName }}</div>
      </div>

      <div v-if="isDrawing && selectedTool && selectedTool !== TOOL_NAME.SELECT"
        class="alert alert-warning py-2 px-3 text-xs">
        <Icon name="warning" class="stroke-current shrink-0 h-4 w-4" />
        <span>正在绘制 {{ currentToolName }}（ESC 或右键取消）</span>
      </div>

      <div class="alert py-2 px-3 text-xs" :class="statusClass">
        <Icon v-if="isSelectMode" name="select" class="stroke-current shrink-0 h-4 w-4" />
        <Icon v-else name="draw_circle" class="stroke-current shrink-0 h-4 w-4" />
        <span>{{ toolStatus }}</span>
      </div>
    </div>
  </FloatingPanelShell>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="status-bar" title="状态信息" icon="info" :width="256">
    <div class="p-3 text-xs space-y-2">
      <div v-if="elementCount !== undefined">
        <div class="badge badge-ghost text-xs">元素总数：{{ elementCount }}</div>
      </div>

      <div>
        <div class="badge badge-neutral text-xs">当前工具：{{ currentToolName }}</div>
      </div>

      <div v-if="isDrawing && selectedTool && selectedTool !== TOOL_NAME.SELECT"
        class="alert alert-warning py-2 px-3 text-xs">
        <Icon name="warning" class="stroke-current shrink-0 h-4 w-4" />
        <span>正在绘制 {{ currentToolName }}（ESC 或右键取消）</span>
      </div>

      <div class="alert py-2 px-3 text-xs" :class="statusClass">
        <Icon v-if="isSelectMode" name="select" class="stroke-current shrink-0 h-4 w-4" />
        <Icon v-else name="draw_circle" class="stroke-current shrink-0 h-4 w-4" />
        <span>{{ toolStatus }}</span>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
