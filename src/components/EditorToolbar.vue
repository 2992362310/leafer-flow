<script setup lang="ts">
import { computed, ref, unref } from "vue";
import type { IconName } from "../assets/icons";
import { TOOL_NAME } from "../editor/constants";
import Icon from "./Icon.vue";

const emits = defineEmits(["tool", "operation"]);
const selectedTool = ref(TOOL_NAME.SELECT);

interface ToolItem {
  tool: string;
  icon: IconName;
  tip: string;
  key?: string;
}

const basicTools: ToolItem[] = [
  { tool: TOOL_NAME.SELECT, icon: "select", tip: "选择 (V)", key: "V" },
  { tool: TOOL_NAME.DRAW_ARROW, icon: "draw_arrow", tip: "连接线 (A)", key: "A" },
  { tool: TOOL_NAME.DRAW_TEXT, icon: "draw_text", tip: "文本 (T)", key: "T" },
];

const flowTools: ToolItem[] = [
  { tool: TOOL_NAME.FLOW_START_END, icon: "flow_start_end", tip: "开始/结束 (1)", key: "1" },
  { tool: TOOL_NAME.FLOW_PROCESS, icon: "flow_process", tip: "处理 (2)", key: "2" },
  { tool: TOOL_NAME.FLOW_DECISION, icon: "flow_decision", tip: "判断 (3)", key: "3" },
  { tool: TOOL_NAME.FLOW_IO, icon: "flow_io", tip: "输入/输出 (4)", key: "4" },
];

const advancedFlowTools: ToolItem[] = [
  { tool: TOOL_NAME.FLOW_DOCUMENT, icon: "flow_document", tip: "文档 (5)", key: "5" },
  { tool: TOOL_NAME.FLOW_DATABASE, icon: "flow_database", tip: "数据存储 (6)", key: "6" },
  { tool: TOOL_NAME.FLOW_SUBPROCESS, icon: "flow_subprocess", tip: "子流程 (7)", key: "7" },
  { tool: TOOL_NAME.FLOW_CONNECTOR, icon: "flow_connector", tip: "连接点 (8)", key: "8" },
  { tool: TOOL_NAME.FLOW_SWIMLANE, icon: "flow_swimlane", tip: "泳道 (9)", key: "9" },
  { tool: TOOL_NAME.FLOW_DELAY, icon: "flow_delay", tip: "延迟" },
  { tool: TOOL_NAME.FLOW_PREPARATION, icon: "flow_preparation", tip: "准备" },
  { tool: TOOL_NAME.FLOW_MANUAL_INPUT, icon: "flow_manual_input", tip: "手动输入" },
  { tool: TOOL_NAME.FLOW_MANUAL_OPERATION, icon: "flow_manual_operation", tip: "手动操作" },
  { tool: TOOL_NAME.FLOW_STORED_DATA, icon: "flow_stored_data", tip: "存储数据" },
  { tool: TOOL_NAME.FLOW_DISPLAY, icon: "flow_display", tip: "显示" },
  { tool: TOOL_NAME.FLOW_OFF_PAGE, icon: "flow_off_page", tip: "离页连接" },
  { tool: TOOL_NAME.FLOW_MERGE, icon: "flow_merge", tip: "合并" },
  { tool: TOOL_NAME.FLOW_ANNOTATION, icon: "flow_annotation", tip: "注释" },
];

const bpmnTools: ToolItem[] = [
  { tool: TOOL_NAME.BPMN_START_EVENT, icon: "bpmn_start_event", tip: "开始事件" },
  { tool: TOOL_NAME.BPMN_INTERMEDIATE_EVENT, icon: "bpmn_intermediate_event", tip: "中间事件" },
  { tool: TOOL_NAME.BPMN_END_EVENT, icon: "bpmn_end_event", tip: "结束事件" },
  { tool: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY, icon: "bpmn_exclusive_gateway", tip: "排他网关" },
  { tool: TOOL_NAME.BPMN_PARALLEL_GATEWAY, icon: "bpmn_parallel_gateway", tip: "并行网关" },
  { tool: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY, icon: "bpmn_inclusive_gateway", tip: "包容网关" },
  { tool: TOOL_NAME.BPMN_TASK, icon: "bpmn_task", tip: "任务" },
  { tool: TOOL_NAME.BPMN_DATA_OBJECT, icon: "bpmn_data_object", tip: "数据对象" },
  { tool: TOOL_NAME.BPMN_DATA_STORE, icon: "bpmn_data_store", tip: "数据存储" },
];

const archTools: ToolItem[] = [
  { tool: TOOL_NAME.ARCH_ACTOR, icon: "arch_actor", tip: "Actor" },
  { tool: TOOL_NAME.ARCH_USE_CASE, icon: "arch_use_case", tip: "用例" },
  { tool: TOOL_NAME.ARCH_COMPONENT, icon: "arch_component", tip: "组件" },
  { tool: TOOL_NAME.ARCH_PACKAGE, icon: "arch_package", tip: "包" },
  { tool: TOOL_NAME.ARCH_NODE, icon: "arch_node", tip: "部署节点" },
  { tool: TOOL_NAME.ARCH_QUEUE, icon: "arch_queue", tip: "队列" },
  { tool: TOOL_NAME.ARCH_CACHE, icon: "arch_cache", tip: "缓存" },
  { tool: TOOL_NAME.ARCH_CLOUD, icon: "arch_cloud", tip: "云" },
  { tool: TOOL_NAME.ARCH_SERVICE, icon: "arch_service", tip: "服务" },
  { tool: TOOL_NAME.ARCH_DEVICE, icon: "arch_device", tip: "设备" },
];

const shapeTools: ToolItem[] = [
  { tool: TOOL_NAME.DRAW_RECT, icon: "draw_rect", tip: "矩形 (R)", key: "R" },
  { tool: TOOL_NAME.DRAW_CIRCLE, icon: "draw_circle", tip: "圆形 (C)", key: "C" },
  { tool: TOOL_NAME.DRAW_DIAMOND, icon: "draw_diamond", tip: "菱形 (D)", key: "D" },
  { tool: TOOL_NAME.DRAW_TRIANGLE, icon: "draw_triangle", tip: "三角形 (U)", key: "U" },
  { tool: TOOL_NAME.DRAW_PENTAGON, icon: "draw_pentagon", tip: "五边形" },
  { tool: TOOL_NAME.DRAW_HEXAGON, icon: "draw_hexagon", tip: "六边形 (X)", key: "X" },
  { tool: TOOL_NAME.DRAW_FREEHAND, icon: "draw_freehand", tip: "自由绘制 (P)", key: "P" },
];

const activeShapeTool = computed(() => shapeTools.find((item) => item.tool === selectedTool.value) ?? shapeTools[0]);

function handleClick(tool: string) {
  emits("tool", {
    command: tool,
    pre: unref(selectedTool),
  });
  changeTool(tool);
}

function changeTool(tool: string) {
  selectedTool.value = tool;
}

function getButtonClass(tool: string) {
  return [
    "btn",
    "btn-sm",
    "join-item",
    "relative",
    "h-9",
    "w-9",
    "px-0",
    { "btn-active": selectedTool.value === tool },
  ];
}

defineExpose({
  selectedTool,
  changeTool,
});
</script>

<template>
  <div class="join">
    <div v-for="item in basicTools" :key="item.tool" class="tooltip tooltip-bottom" :data-tip="item.tip">
      <button @click.prevent="handleClick(item.tool)" :class="getButtonClass(item.tool)">
        <Icon :name="item.icon" class="h-5 w-5" />
        <span v-if="item.key" class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">{{ item.key }}</span>
      </button>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div v-for="item in flowTools" :key="item.tool" class="tooltip tooltip-bottom" :data-tip="item.tip">
      <button @click.prevent="handleClick(item.tool)" :class="getButtonClass(item.tool)">
        <Icon :name="item.icon" class="h-5 w-5" />
        <span v-if="item.key" class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono">{{ item.key }}</span>
      </button>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="更多流程元素">
        <button tabindex="0" role="button" :class="getButtonClass(advancedFlowTools[0].tool)">
          <Icon name="template" class="h-5 w-5" />
        </button>
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200 max-h-[70vh] overflow-y-auto">
        <li v-for="item in advancedFlowTools" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="BPMN">
        <button tabindex="0" role="button" :class="getButtonClass(bpmnTools[0].tool)">
          <Icon name="bpmn_start_event" class="h-5 w-5" />
        </button>
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200">
        <li v-for="item in bpmnTools" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="架构图">
        <button tabindex="0" role="button" :class="getButtonClass(archTools[0].tool)">
          <Icon name="arch_component" class="h-5 w-5" />
        </button>
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200">
        <li v-for="item in archTools" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="更多图形">
        <button tabindex="0" role="button" :class="getButtonClass(activeShapeTool.tool)">
          <Icon :name="activeShapeTool.icon" class="h-5 w-5" />
        </button>
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-20 w-44 p-2 shadow border border-base-200">
        <li v-for="item in shapeTools" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
