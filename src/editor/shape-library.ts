import type { IconName } from "../assets/icons";
import { TOOL_NAME } from "./constants";

export interface ShapeLibraryItem {
  tool: string;
  icon: IconName;
  label: string;
  keywords: string[];
  width?: number;
  height?: number;
}

export interface ShapeLibraryGroup {
  id: string;
  title: string;
  items: ShapeLibraryItem[];
}

export const shapeLibraryGroups: ShapeLibraryGroup[] = [
  {
    id: "basic",
    title: "基础图形",
    items: [
      { tool: TOOL_NAME.DRAW_RECT, icon: "draw_rect", label: "矩形", keywords: ["rect", "rectangle"], width: 120, height: 72 },
      { tool: TOOL_NAME.DRAW_CIRCLE, icon: "draw_circle", label: "圆形", keywords: ["circle", "ellipse"], width: 96, height: 96 },
      { tool: TOOL_NAME.DRAW_DIAMOND, icon: "draw_diamond", label: "菱形", keywords: ["diamond"], width: 112, height: 82 },
      { tool: TOOL_NAME.DRAW_TRIANGLE, icon: "draw_triangle", label: "三角形", keywords: ["triangle"], width: 112, height: 88 },
      { tool: TOOL_NAME.DRAW_PENTAGON, icon: "draw_pentagon", label: "五边形", keywords: ["pentagon"], width: 112, height: 92 },
      { tool: TOOL_NAME.DRAW_HEXAGON, icon: "draw_hexagon", label: "六边形", keywords: ["hexagon"], width: 124, height: 82 },
      { tool: TOOL_NAME.DRAW_TEXT, icon: "draw_text", label: "文本", keywords: ["text"], width: 140, height: 32 },
      { tool: TOOL_NAME.DRAW_FREEHAND, icon: "draw_freehand", label: "自由绘制", keywords: ["freehand", "pen"], width: 120, height: 72 },
    ],
  },
  {
    id: "flow",
    title: "流程图",
    items: [
      { tool: TOOL_NAME.FLOW_START_END, icon: "flow_start_end", label: "开始/结束", keywords: ["start", "end"], width: 132, height: 64 },
      { tool: TOOL_NAME.FLOW_PROCESS, icon: "flow_process", label: "处理", keywords: ["process"], width: 132, height: 72 },
      { tool: TOOL_NAME.FLOW_DECISION, icon: "flow_decision", label: "判断", keywords: ["decision"], width: 118, height: 88 },
      { tool: TOOL_NAME.FLOW_IO, icon: "flow_io", label: "输入/输出", keywords: ["input", "output"], width: 140, height: 72 },
      { tool: TOOL_NAME.FLOW_DOCUMENT, icon: "flow_document", label: "文档", keywords: ["document"], width: 132, height: 82 },
      { tool: TOOL_NAME.FLOW_DATABASE, icon: "flow_database", label: "数据存储", keywords: ["database", "data"], width: 126, height: 88 },
      { tool: TOOL_NAME.FLOW_SUBPROCESS, icon: "flow_subprocess", label: "子流程", keywords: ["subprocess"], width: 140, height: 76 },
      { tool: TOOL_NAME.FLOW_SWIMLANE, icon: "flow_swimlane", label: "泳道", keywords: ["swimlane"], width: 220, height: 120 },
      { tool: TOOL_NAME.FLOW_DELAY, icon: "flow_delay", label: "延迟", keywords: ["delay"], width: 128, height: 72 },
      { tool: TOOL_NAME.FLOW_PREPARATION, icon: "flow_preparation", label: "准备", keywords: ["preparation"], width: 132, height: 76 },
      { tool: TOOL_NAME.FLOW_MANUAL_INPUT, icon: "flow_manual_input", label: "手动输入", keywords: ["manual", "input"], width: 140, height: 72 },
      { tool: TOOL_NAME.FLOW_MANUAL_OPERATION, icon: "flow_manual_operation", label: "手动操作", keywords: ["manual", "operation"], width: 140, height: 72 },
      { tool: TOOL_NAME.FLOW_STORED_DATA, icon: "flow_stored_data", label: "存储数据", keywords: ["stored", "data"], width: 132, height: 78 },
      { tool: TOOL_NAME.FLOW_DISPLAY, icon: "flow_display", label: "显示", keywords: ["display"], width: 128, height: 74 },
      { tool: TOOL_NAME.FLOW_OFF_PAGE, icon: "flow_off_page", label: "离页连接", keywords: ["offpage"], width: 110, height: 92 },
      { tool: TOOL_NAME.FLOW_MERGE, icon: "flow_merge", label: "合并", keywords: ["merge"], width: 112, height: 86 },
      { tool: TOOL_NAME.FLOW_ANNOTATION, icon: "flow_annotation", label: "注释", keywords: ["annotation"], width: 140, height: 72 },
    ],
  },
  {
    id: "bpmn",
    title: "BPMN",
    items: [
      { tool: TOOL_NAME.BPMN_START_EVENT, icon: "bpmn_start_event", label: "开始事件", keywords: ["bpmn", "start", "event"], width: 90, height: 90 },
      { tool: TOOL_NAME.BPMN_INTERMEDIATE_EVENT, icon: "bpmn_intermediate_event", label: "中间事件", keywords: ["bpmn", "intermediate", "event"], width: 90, height: 90 },
      { tool: TOOL_NAME.BPMN_END_EVENT, icon: "bpmn_end_event", label: "结束事件", keywords: ["bpmn", "end", "event"], width: 90, height: 90 },
      { tool: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY, icon: "bpmn_exclusive_gateway", label: "排他网关", keywords: ["bpmn", "exclusive", "gateway"], width: 96, height: 96 },
      { tool: TOOL_NAME.BPMN_PARALLEL_GATEWAY, icon: "bpmn_parallel_gateway", label: "并行网关", keywords: ["bpmn", "parallel", "gateway"], width: 96, height: 96 },
      { tool: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY, icon: "bpmn_inclusive_gateway", label: "包容网关", keywords: ["bpmn", "inclusive", "gateway"], width: 96, height: 96 },
      { tool: TOOL_NAME.BPMN_TASK, icon: "bpmn_task", label: "任务", keywords: ["bpmn", "task"], width: 140, height: 78 },
      { tool: TOOL_NAME.BPMN_DATA_OBJECT, icon: "bpmn_data_object", label: "数据对象", keywords: ["bpmn", "data", "object"], width: 104, height: 128 },
      { tool: TOOL_NAME.BPMN_DATA_STORE, icon: "bpmn_data_store", label: "数据存储", keywords: ["bpmn", "data", "store"], width: 126, height: 88 },
    ],
  },
  {
    id: "architecture",
    title: "架构图",
    items: [
      { tool: TOOL_NAME.ARCH_ACTOR, icon: "arch_actor", label: "Actor", keywords: ["actor", "user"], width: 86, height: 128 },
      { tool: TOOL_NAME.ARCH_USE_CASE, icon: "arch_use_case", label: "用例", keywords: ["usecase"], width: 136, height: 82 },
      { tool: TOOL_NAME.ARCH_COMPONENT, icon: "arch_component", label: "组件", keywords: ["component"], width: 140, height: 92 },
      { tool: TOOL_NAME.ARCH_PACKAGE, icon: "arch_package", label: "包", keywords: ["package"], width: 148, height: 96 },
      { tool: TOOL_NAME.ARCH_NODE, icon: "arch_node", label: "部署节点", keywords: ["node", "deployment"], width: 140, height: 96 },
      { tool: TOOL_NAME.ARCH_QUEUE, icon: "arch_queue", label: "队列", keywords: ["queue", "mq"], width: 140, height: 74 },
      { tool: TOOL_NAME.ARCH_CACHE, icon: "arch_cache", label: "缓存", keywords: ["cache"], width: 126, height: 88 },
      { tool: TOOL_NAME.ARCH_CLOUD, icon: "arch_cloud", label: "云", keywords: ["cloud"], width: 140, height: 86 },
      { tool: TOOL_NAME.ARCH_SERVICE, icon: "arch_service", label: "服务", keywords: ["service"], width: 140, height: 86 },
      { tool: TOOL_NAME.ARCH_DEVICE, icon: "arch_device", label: "设备", keywords: ["device"], width: 126, height: 94 },
    ],
  },
];
