<script setup lang="ts">
import { computed, ref } from "vue";
import { TOOL_NAME } from "../editor/constants";
import Icon from "./Icon.vue";

const props = defineProps<{
  selectedTool?: string | null;
  isDrawing?: boolean;
  elementCount?: number;
}>();

const isCollapsed = ref(false);

const toolLabels: Record<string, string> = {
  [TOOL_NAME.SELECT]: "选择",
  [TOOL_NAME.DRAW_ARROW]: "连接线",
  [TOOL_NAME.DRAW_ARROW_STRAIGHT]: "直线箭头",
  [TOOL_NAME.DRAW_ARROW_BEZIER]: "贝塞尔箭头",
  [TOOL_NAME.DRAW_RECT]: "矩形",
  [TOOL_NAME.DRAW_CIRCLE]: "圆形",
  [TOOL_NAME.DRAW_DIAMOND]: "菱形",
  [TOOL_NAME.DRAW_TRIANGLE]: "三角形",
  [TOOL_NAME.DRAW_PENTAGON]: "五边形",
  [TOOL_NAME.DRAW_HEXAGON]: "六边形",
  [TOOL_NAME.DRAW_TEXT]: "文本",
  [TOOL_NAME.DRAW_FREEHAND]: "自由绘制",
  [TOOL_NAME.FLOW_START_END]: "开始/结束",
  [TOOL_NAME.FLOW_PROCESS]: "处理",
  [TOOL_NAME.FLOW_DECISION]: "判断",
  [TOOL_NAME.FLOW_IO]: "输入/输出",
  [TOOL_NAME.FLOW_DOCUMENT]: "文档",
  [TOOL_NAME.FLOW_DATABASE]: "数据存储",
  [TOOL_NAME.FLOW_SUBPROCESS]: "子流程",
  [TOOL_NAME.FLOW_CONNECTOR]: "连接点",
  [TOOL_NAME.FLOW_SWIMLANE]: "泳道",
  [TOOL_NAME.FLOW_DELAY]: "延迟",
  [TOOL_NAME.FLOW_PREPARATION]: "准备",
  [TOOL_NAME.FLOW_MANUAL_INPUT]: "手动输入",
  [TOOL_NAME.FLOW_MANUAL_OPERATION]: "手动操作",
  [TOOL_NAME.FLOW_STORED_DATA]: "存储数据",
  [TOOL_NAME.FLOW_DISPLAY]: "显示",
  [TOOL_NAME.FLOW_OFF_PAGE]: "离页连接",
  [TOOL_NAME.FLOW_MERGE]: "合并",
  [TOOL_NAME.FLOW_ANNOTATION]: "注释",
  [TOOL_NAME.BPMN_START_EVENT]: "开始事件",
  [TOOL_NAME.BPMN_INTERMEDIATE_EVENT]: "中间事件",
  [TOOL_NAME.BPMN_END_EVENT]: "结束事件",
  [TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY]: "排他网关",
  [TOOL_NAME.BPMN_PARALLEL_GATEWAY]: "并行网关",
  [TOOL_NAME.BPMN_INCLUSIVE_GATEWAY]: "包容网关",
  [TOOL_NAME.BPMN_TASK]: "任务",
  [TOOL_NAME.BPMN_DATA_OBJECT]: "数据对象",
  [TOOL_NAME.BPMN_DATA_STORE]: "数据存储",
  [TOOL_NAME.ARCH_ACTOR]: "Actor",
  [TOOL_NAME.ARCH_USE_CASE]: "用例",
  [TOOL_NAME.ARCH_COMPONENT]: "组件",
  [TOOL_NAME.ARCH_PACKAGE]: "包",
  [TOOL_NAME.ARCH_NODE]: "部署节点",
  [TOOL_NAME.ARCH_QUEUE]: "队列",
  [TOOL_NAME.ARCH_CACHE]: "缓存",
  [TOOL_NAME.ARCH_CLOUD]: "云",
  [TOOL_NAME.ARCH_SERVICE]: "服务",
  [TOOL_NAME.ARCH_DEVICE]: "设备",
};

const currentToolName = computed(() => {
  if (!props.selectedTool) return "无";
  return toolLabels[props.selectedTool] ?? props.selectedTool;
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
      <button @click="toggleCollapse" class="btn btn-xs btn-ghost" :title="isCollapsed ? '展开状态' : '折叠状态'">
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
