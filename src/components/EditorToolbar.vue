<script setup lang="ts">
import { computed, ref, unref } from "vue";
import type { IconName } from "../assets/icons";
import { TOOL_NAME } from "../editor/constants";
import type { ToolToolbarGroup, ToolToolbarItem } from "../editor/api/tool";
import Icon from "./Icon.vue";

const props = defineProps<{
  groups?: ToolToolbarGroup[];
}>();

const emits = defineEmits(["tool", "operation"]);
const selectedTool = ref<string>(TOOL_NAME.SELECT);

interface ToolItem {
  tool: string;
  icon: IconName;
  tip: string;
  shortcut?: string;
}

const selectTool: ToolItem = {
  tool: TOOL_NAME.SELECT,
  icon: "select",
  tip: "选择 (V)",
  shortcut: "V",
};

const fallbackGroups: ToolToolbarGroup[] = [
  {
    id: "core",
    title: "核心工具",
    items: [
      { tool: TOOL_NAME.DRAW_ARROW, icon: "draw_arrow", tip: "连接线 (A)", shortcut: "A" },
      { tool: TOOL_NAME.DRAW_TEXT, icon: "draw_text", tip: "文本 (T)", shortcut: "T" },
    ],
  },
  {
    id: "flow",
    title: "流程图",
    items: [
      {
        tool: TOOL_NAME.FLOW_START_END,
        icon: "flow_start_end",
        tip: "开始/结束 (1)",
        shortcut: "1",
      },
      { tool: TOOL_NAME.FLOW_PROCESS, icon: "flow_process", tip: "处理 (2)", shortcut: "2" },
      { tool: TOOL_NAME.FLOW_DECISION, icon: "flow_decision", tip: "判断 (3)", shortcut: "3" },
      { tool: TOOL_NAME.FLOW_IO, icon: "flow_io", tip: "输入/输出 (4)", shortcut: "4" },
    ],
  },
  {
    id: "shapes",
    title: "更多图形",
    items: [
      { tool: TOOL_NAME.DRAW_RECT, icon: "draw_rect", tip: "矩形 (R)", shortcut: "R" },
      { tool: TOOL_NAME.DRAW_CIRCLE, icon: "draw_circle", tip: "圆形 (C)", shortcut: "C" },
      { tool: TOOL_NAME.DRAW_DIAMOND, icon: "draw_diamond", tip: "菱形 (D)", shortcut: "D" },
      { tool: TOOL_NAME.DRAW_TRIANGLE, icon: "draw_triangle", tip: "三角形 (U)", shortcut: "U" },
      { tool: TOOL_NAME.DRAW_PENTAGON, icon: "draw_pentagon", tip: "五边形" },
      { tool: TOOL_NAME.DRAW_HEXAGON, icon: "draw_hexagon", tip: "六边形 (X)", shortcut: "X" },
      { tool: TOOL_NAME.DRAW_FREEHAND, icon: "draw_freehand", tip: "自由绘制 (P)", shortcut: "P" },
    ],
  },
];

const visibleGroups = computed(() => (props.groups?.length ? props.groups : fallbackGroups));
const coreItems = computed<ToolItem[]>(() => [
  selectTool,
  ...toToolItems(findGroup("core")?.items ?? []),
]);
const primaryFlowItems = computed(() => toToolItems(findGroup("flow")?.items.slice(0, 4) ?? []));
const advancedFlowItems = computed(() => toToolItems(findGroup("flow")?.items.slice(4) ?? []));
const bpmnItems = computed(() => toToolItems(findGroup("bpmn")?.items ?? []));
const architectureItems = computed(() => toToolItems(findGroup("architecture")?.items ?? []));
const shapeItems = computed(() => toToolItems(findGroup("shapes")?.items ?? []));
const activeShapeTool = computed(
  () => shapeItems.value.find((item) => item.tool === selectedTool.value) ?? shapeItems.value[0],
);

function findGroup(id: string) {
  return visibleGroups.value.find((group) => group.id === id);
}

function toToolItems(items: ToolToolbarItem[]): ToolItem[] {
  return items.map((item) => ({
    tool: item.tool,
    icon: item.icon,
    tip: item.tip,
    shortcut: item.shortcut,
  }));
}

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
    <div
      v-for="item in coreItems"
      :key="item.tool"
      class="tooltip tooltip-bottom"
      :data-tip="item.tip"
    >
      <button @click.prevent="handleClick(item.tool)" :class="getButtonClass(item.tool)">
        <Icon :name="item.icon" class="h-5 w-5" />
        <span
          v-if="item.shortcut"
          class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono"
          >{{ item.shortcut }}</span
        >
      </button>
    </div>

    <template v-if="primaryFlowItems.length > 0">
      <span class="divider divider-horizontal mx-0 my-1"></span>
      <div
        v-for="item in primaryFlowItems"
        :key="item.tool"
        class="tooltip tooltip-bottom"
        :data-tip="item.tip"
      >
        <button @click.prevent="handleClick(item.tool)" :class="getButtonClass(item.tool)">
          <Icon :name="item.icon" class="h-5 w-5" />
          <span
            v-if="item.shortcut"
            class="absolute bottom-0.5 right-1 text-[9px] opacity-60 font-mono"
            >{{ item.shortcut }}</span
          >
        </button>
      </div>
    </template>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div v-if="advancedFlowItems.length > 0" class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="更多流程元素">
        <button tabindex="0" role="button" :class="getButtonClass(advancedFlowItems[0].tool)">
          <Icon name="template" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200 max-h-[70vh] overflow-y-auto"
      >
        <li v-for="item in advancedFlowItems" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <div v-if="bpmnItems.length > 0" class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="BPMN">
        <button tabindex="0" role="button" :class="getButtonClass(bpmnItems[0].tool)">
          <Icon name="bpmn_start_event" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200"
      >
        <li v-for="item in bpmnItems" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <div v-if="architectureItems.length > 0" class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="架构图">
        <button tabindex="0" role="button" :class="getButtonClass(architectureItems[0].tool)">
          <Icon name="arch_component" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow border border-base-200"
      >
        <li v-for="item in architectureItems" :key="item.tool">
          <button @click.prevent="handleClick(item.tool)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.tip }}
          </button>
        </li>
      </ul>
    </div>

    <template v-if="activeShapeTool">
      <span class="divider divider-horizontal mx-0 my-1"></span>
      <div class="dropdown dropdown-bottom">
        <div class="tooltip tooltip-bottom" data-tip="更多图形">
          <button tabindex="0" role="button" :class="getButtonClass(activeShapeTool.tool)">
            <Icon :name="activeShapeTool.icon" class="h-5 w-5" />
          </button>
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-100 rounded-box z-20 w-44 p-2 shadow border border-base-200"
        >
          <li v-for="item in shapeItems" :key="item.tool">
            <button @click.prevent="handleClick(item.tool)" class="text-xs">
              <Icon :name="item.icon" class="h-4 w-4" />
              {{ item.tip }}
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
