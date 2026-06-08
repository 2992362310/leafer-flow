<script setup lang="ts">
import { computed, ref } from "vue";
import { TOOL_NAME } from "../editor/constants";
import Icon from "./Icon.vue";

const props = defineProps<{
  selectedTool?: string | null;
  toolLabels?: Record<string, string>;
  isDrawing?: boolean;
  elementCount?: number;
}>();

const isCollapsed = ref(false);

const currentToolName = computed(() => {
  if (!props.selectedTool) return "无";
  return props.toolLabels?.[props.selectedTool] ?? props.selectedTool;
});

const isSelectMode = computed(() => !props.selectedTool || props.selectedTool === TOOL_NAME.SELECT);
const toolStatus = computed(() =>
  isSelectMode.value ? "选择模式：点击元素可选中并编辑" : "绘制模式：点击或拖拽画布创建元素",
);
const statusClass = computed(() => (isSelectMode.value ? "alert-success" : "alert-info"));

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div class="bg-base-100 rounded-lg shadow-md p-2 min-w-[220px]">
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-sm">状态信息</span>
      <button
        @click="toggleCollapse"
        class="btn btn-xs btn-ghost"
        :title="isCollapsed ? '展开状态' : '折叠状态'"
      >
        <Icon :name="isCollapsed ? 'arrow-down' : 'arrow-up'" class="h-3 w-3" />
      </button>
    </div>

    <div v-show="!isCollapsed">
      <div v-if="elementCount !== undefined" class="mb-2">
        <div class="badge badge-ghost text-xs">元素总数：{{ elementCount }}</div>
      </div>

      <div class="mb-2">
        <div class="badge badge-neutral text-xs">当前工具：{{ currentToolName }}</div>
      </div>

      <div v-if="isDrawing && selectedTool && selectedTool !== TOOL_NAME.SELECT" class="mb-2">
        <div class="alert alert-warning py-2 px-3 text-xs">
          <Icon name="clear" class="stroke-current shrink-0 h-4 w-4" />
          <span>正在绘制 {{ currentToolName }}（ESC 或右键取消）</span>
        </div>
      </div>

      <div class="mb-2">
        <div class="alert py-2 px-3 text-xs" :class="statusClass">
          <Icon v-if="isSelectMode" name="select" class="stroke-current shrink-0 h-4 w-4" />
          <Icon v-else name="draw_circle" class="stroke-current shrink-0 h-4 w-4" />
          <span>{{ toolStatus }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
