import type { IconName } from "../assets/icons";
import { TOOL_NAME, type ToolName } from "./constants";
import type { FlowNodeKind } from "./tools/draw-flow-node";

export interface ShapeLibraryItem {
  tool: ToolName;
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

type ToolGroupId = "basic" | "flow" | "bpmn" | "architecture";
type ClassToolKind = "rect" | "arrow" | "circle" | "diamond" | "text" | "freehand";

interface ToolLibraryConfig {
  groupId: ToolGroupId;
  icon: IconName;
  keywords: string[];
  width?: number;
  height?: number;
}

type ToolRegistrationConfig =
  | {
    type: "class";
    toolKind: ClassToolKind;
  }
  | {
    type: "flow-node";
    kind: FlowNodeKind;
    fill: string;
    stroke: string;
    strokeWidth?: number;
    cornerRadius?: number;
  };

interface BaseToolDefinition {
  tool: ToolName;
  label: string;
  library?: ToolLibraryConfig;
}

export interface ClassToolDefinition extends BaseToolDefinition {
  registration: Extract<ToolRegistrationConfig, { type: "class" }>;
}

export interface FlowNodeToolDefinition extends BaseToolDefinition {
  registration: Extract<ToolRegistrationConfig, { type: "flow-node" }>;
}

export type ToolDefinition = ClassToolDefinition | FlowNodeToolDefinition;

const toolGroupTitles: Record<ToolGroupId, string> = {
  basic: "基础图形",
  flow: "流程图",
  bpmn: "BPMN",
  architecture: "架构图",
};

export const toolDefinitions: ToolDefinition[] = [
  {
    tool: TOOL_NAME.DRAW_RECT,
    label: "矩形",
    registration: { type: "class", toolKind: "rect" },
    library: {
      groupId: "basic",
      icon: "draw_rect",
      keywords: ["rect", "rectangle"],
      width: 120,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.DRAW_ARROW,
    label: "连接线",
    registration: { type: "class", toolKind: "arrow" },
  },
  {
    tool: TOOL_NAME.DRAW_CIRCLE,
    label: "圆形",
    registration: { type: "class", toolKind: "circle" },
    library: {
      groupId: "basic",
      icon: "draw_circle",
      keywords: ["circle", "ellipse"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.DRAW_DIAMOND,
    label: "菱形",
    registration: { type: "class", toolKind: "diamond" },
    library: {
      groupId: "basic",
      icon: "draw_diamond",
      keywords: ["diamond"],
      width: 112,
      height: 82,
    },
  },
  {
    tool: TOOL_NAME.DRAW_TRIANGLE,
    label: "三角形",
    registration: { type: "flow-node", kind: "triangle", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "basic",
      icon: "draw_triangle",
      keywords: ["triangle"],
      width: 112,
      height: 88,
    },
  },
  {
    tool: TOOL_NAME.DRAW_PENTAGON,
    label: "五边形",
    registration: { type: "flow-node", kind: "pentagon", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "basic",
      icon: "draw_pentagon",
      keywords: ["pentagon"],
      width: 112,
      height: 92,
    },
  },
  {
    tool: TOOL_NAME.DRAW_HEXAGON,
    label: "六边形",
    registration: { type: "flow-node", kind: "hexagon", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "basic",
      icon: "draw_hexagon",
      keywords: ["hexagon"],
      width: 124,
      height: 82,
    },
  },
  {
    tool: TOOL_NAME.DRAW_TEXT,
    label: "文本",
    registration: { type: "class", toolKind: "text" },
    library: {
      groupId: "basic",
      icon: "draw_text",
      keywords: ["text"],
      width: 140,
      height: 32,
    },
  },
  {
    tool: TOOL_NAME.DRAW_FREEHAND,
    label: "自由绘制",
    registration: { type: "class", toolKind: "freehand" },
    library: {
      groupId: "basic",
      icon: "draw_freehand",
      keywords: ["freehand", "pen"],
      width: 120,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_START_END,
    label: "开始/结束",
    registration: { type: "flow-node", kind: "startEnd", fill: "#ecfdf5", stroke: "#059669" },
    library: {
      groupId: "flow",
      icon: "flow_start_end",
      keywords: ["start", "end"],
      width: 132,
      height: 64,
    },
  },
  {
    tool: TOOL_NAME.FLOW_PROCESS,
    label: "处理",
    registration: { type: "flow-node", kind: "process", fill: "#eff6ff", stroke: "#2563eb" },
    library: {
      groupId: "flow",
      icon: "flow_process",
      keywords: ["process"],
      width: 132,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_DECISION,
    label: "判断",
    registration: { type: "flow-node", kind: "decision", fill: "#fffbeb", stroke: "#d97706" },
    library: {
      groupId: "flow",
      icon: "flow_decision",
      keywords: ["decision"],
      width: 118,
      height: 88,
    },
  },
  {
    tool: TOOL_NAME.FLOW_IO,
    label: "输入/输出",
    registration: { type: "flow-node", kind: "io", fill: "#f5f3ff", stroke: "#7c3aed" },
    library: {
      groupId: "flow",
      icon: "flow_io",
      keywords: ["input", "output"],
      width: 140,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_DOCUMENT,
    label: "文档",
    registration: { type: "flow-node", kind: "document", fill: "#fff7ed", stroke: "#ea580c" },
    library: {
      groupId: "flow",
      icon: "flow_document",
      keywords: ["document"],
      width: 132,
      height: 82,
    },
  },
  {
    tool: TOOL_NAME.FLOW_DATABASE,
    label: "数据存储",
    registration: { type: "flow-node", kind: "database", fill: "#ecfeff", stroke: "#0891b2" },
    library: {
      groupId: "flow",
      icon: "flow_database",
      keywords: ["database", "data"],
      width: 126,
      height: 88,
    },
  },
  {
    tool: TOOL_NAME.FLOW_SUBPROCESS,
    label: "子流程",
    registration: { type: "flow-node", kind: "subprocess", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "flow",
      icon: "flow_subprocess",
      keywords: ["subprocess"],
      width: 140,
      height: 76,
    },
  },
  {
    tool: TOOL_NAME.FLOW_CONNECTOR,
    label: "连接点",
    registration: { type: "flow-node", kind: "connector", fill: "#ffffff", stroke: "#64748b" },
  },
  {
    tool: TOOL_NAME.FLOW_SWIMLANE,
    label: "泳道",
    registration: { type: "flow-node", kind: "swimlane", fill: "#f0f9ff", stroke: "#0284c7" },
    library: {
      groupId: "flow",
      icon: "flow_swimlane",
      keywords: ["swimlane"],
      width: 220,
      height: 120,
    },
  },
  {
    tool: TOOL_NAME.FLOW_DELAY,
    label: "延迟",
    registration: { type: "flow-node", kind: "delay", fill: "#fefce8", stroke: "#ca8a04" },
    library: {
      groupId: "flow",
      icon: "flow_delay",
      keywords: ["delay"],
      width: 128,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_PREPARATION,
    label: "准备",
    registration: { type: "flow-node", kind: "preparation", fill: "#f0fdf4", stroke: "#16a34a" },
    library: {
      groupId: "flow",
      icon: "flow_preparation",
      keywords: ["preparation"],
      width: 132,
      height: 76,
    },
  },
  {
    tool: TOOL_NAME.FLOW_MANUAL_INPUT,
    label: "手动输入",
    registration: { type: "flow-node", kind: "manualInput", fill: "#fdf2f8", stroke: "#db2777" },
    library: {
      groupId: "flow",
      icon: "flow_manual_input",
      keywords: ["manual", "input"],
      width: 140,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_MANUAL_OPERATION,
    label: "手动操作",
    registration: { type: "flow-node", kind: "manualOperation", fill: "#f5f3ff", stroke: "#7c3aed" },
    library: {
      groupId: "flow",
      icon: "flow_manual_operation",
      keywords: ["manual", "operation"],
      width: 140,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_STORED_DATA,
    label: "存储数据",
    registration: { type: "flow-node", kind: "storedData", fill: "#ecfeff", stroke: "#0891b2" },
    library: {
      groupId: "flow",
      icon: "flow_stored_data",
      keywords: ["stored", "data"],
      width: 132,
      height: 78,
    },
  },
  {
    tool: TOOL_NAME.FLOW_DISPLAY,
    label: "显示",
    registration: { type: "flow-node", kind: "display", fill: "#eef2ff", stroke: "#4f46e5" },
    library: {
      groupId: "flow",
      icon: "flow_display",
      keywords: ["display"],
      width: 128,
      height: 74,
    },
  },
  {
    tool: TOOL_NAME.FLOW_OFF_PAGE,
    label: "离页连接",
    registration: { type: "flow-node", kind: "offPage", fill: "#fff7ed", stroke: "#ea580c" },
    library: {
      groupId: "flow",
      icon: "flow_off_page",
      keywords: ["offpage"],
      width: 110,
      height: 92,
    },
  },
  {
    tool: TOOL_NAME.FLOW_MERGE,
    label: "合并",
    registration: { type: "flow-node", kind: "merge", fill: "#fef2f2", stroke: "#dc2626" },
    library: {
      groupId: "flow",
      icon: "flow_merge",
      keywords: ["merge"],
      width: 112,
      height: 86,
    },
  },
  {
    tool: TOOL_NAME.FLOW_ANNOTATION,
    label: "注释",
    registration: { type: "flow-node", kind: "annotation", fill: "#ffffff", stroke: "#64748b" },
    library: {
      groupId: "flow",
      icon: "flow_annotation",
      keywords: ["annotation"],
      width: 140,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.BPMN_START_EVENT,
    label: "开始事件",
    registration: { type: "flow-node", kind: "bpmnStartEvent", fill: "#ffffff", stroke: "#16a34a" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_start_event",
      keywords: ["bpmn", "start", "event"],
      width: 90,
      height: 90,
    },
  },
  {
    tool: TOOL_NAME.BPMN_INTERMEDIATE_EVENT,
    label: "中间事件",
    registration: {
      type: "flow-node",
      kind: "bpmnIntermediateEvent",
      fill: "#ffffff",
      stroke: "#ca8a04",
      strokeWidth: 3,
    },
    library: {
      groupId: "bpmn",
      icon: "bpmn_intermediate_event",
      keywords: ["bpmn", "intermediate", "event"],
      width: 90,
      height: 90,
    },
  },
  {
    tool: TOOL_NAME.BPMN_END_EVENT,
    label: "结束事件",
    registration: {
      type: "flow-node",
      kind: "bpmnEndEvent",
      fill: "#ffffff",
      stroke: "#dc2626",
      strokeWidth: 4,
    },
    library: {
      groupId: "bpmn",
      icon: "bpmn_end_event",
      keywords: ["bpmn", "end", "event"],
      width: 90,
      height: 90,
    },
  },
  {
    tool: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
    label: "排他网关",
    registration: { type: "flow-node", kind: "bpmnExclusiveGateway", fill: "#fffbeb", stroke: "#d97706" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_exclusive_gateway",
      keywords: ["bpmn", "exclusive", "gateway"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.BPMN_PARALLEL_GATEWAY,
    label: "并行网关",
    registration: { type: "flow-node", kind: "bpmnParallelGateway", fill: "#eff6ff", stroke: "#2563eb" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_parallel_gateway",
      keywords: ["bpmn", "parallel", "gateway"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY,
    label: "包容网关",
    registration: { type: "flow-node", kind: "bpmnInclusiveGateway", fill: "#f5f3ff", stroke: "#7c3aed" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_inclusive_gateway",
      keywords: ["bpmn", "inclusive", "gateway"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.BPMN_TASK,
    label: "任务",
    registration: {
      type: "flow-node",
      kind: "bpmnTask",
      fill: "#ffffff",
      stroke: "#475569",
      cornerRadius: 10,
    },
    library: {
      groupId: "bpmn",
      icon: "bpmn_task",
      keywords: ["bpmn", "task"],
      width: 140,
      height: 78,
    },
  },
  {
    tool: TOOL_NAME.BPMN_DATA_OBJECT,
    label: "数据对象",
    registration: { type: "flow-node", kind: "bpmnDataObject", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_data_object",
      keywords: ["bpmn", "data", "object"],
      width: 104,
      height: 128,
    },
  },
  {
    tool: TOOL_NAME.BPMN_DATA_STORE,
    label: "数据存储",
    registration: { type: "flow-node", kind: "bpmnDataStore", fill: "#ecfeff", stroke: "#0891b2" },
    library: {
      groupId: "bpmn",
      icon: "bpmn_data_store",
      keywords: ["bpmn", "data", "store"],
      width: 126,
      height: 88,
    },
  },
  {
    tool: TOOL_NAME.ARCH_ACTOR,
    label: "Actor",
    registration: { type: "flow-node", kind: "archActor", fill: "#ffffff", stroke: "#111827" },
    library: {
      groupId: "architecture",
      icon: "arch_actor",
      keywords: ["actor", "user"],
      width: 86,
      height: 128,
    },
  },
  {
    tool: TOOL_NAME.ARCH_USE_CASE,
    label: "用例",
    registration: { type: "flow-node", kind: "archUseCase", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "architecture",
      icon: "arch_use_case",
      keywords: ["usecase"],
      width: 136,
      height: 82,
    },
  },
  {
    tool: TOOL_NAME.ARCH_COMPONENT,
    label: "组件",
    registration: { type: "flow-node", kind: "archComponent", fill: "#eff6ff", stroke: "#2563eb" },
    library: {
      groupId: "architecture",
      icon: "arch_component",
      keywords: ["component"],
      width: 140,
      height: 92,
    },
  },
  {
    tool: TOOL_NAME.ARCH_PACKAGE,
    label: "包",
    registration: { type: "flow-node", kind: "archPackage", fill: "#fff7ed", stroke: "#ea580c" },
    library: {
      groupId: "architecture",
      icon: "arch_package",
      keywords: ["package"],
      width: 148,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.ARCH_NODE,
    label: "部署节点",
    registration: { type: "flow-node", kind: "archNode", fill: "#f8fafc", stroke: "#475569" },
    library: {
      groupId: "architecture",
      icon: "arch_node",
      keywords: ["node", "deployment"],
      width: 140,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.ARCH_QUEUE,
    label: "队列",
    registration: { type: "flow-node", kind: "archQueue", fill: "#f0f9ff", stroke: "#0284c7" },
    library: {
      groupId: "architecture",
      icon: "arch_queue",
      keywords: ["queue", "mq"],
      width: 140,
      height: 74,
    },
  },
  {
    tool: TOOL_NAME.ARCH_CACHE,
    label: "缓存",
    registration: { type: "flow-node", kind: "archCache", fill: "#ecfeff", stroke: "#0891b2" },
    library: {
      groupId: "architecture",
      icon: "arch_cache",
      keywords: ["cache"],
      width: 126,
      height: 88,
    },
  },
  {
    tool: TOOL_NAME.ARCH_CLOUD,
    label: "云",
    registration: { type: "flow-node", kind: "archCloud", fill: "#eef2ff", stroke: "#4f46e5" },
    library: {
      groupId: "architecture",
      icon: "arch_cloud",
      keywords: ["cloud"],
      width: 140,
      height: 86,
    },
  },
  {
    tool: TOOL_NAME.ARCH_SERVICE,
    label: "服务",
    registration: { type: "flow-node", kind: "archService", fill: "#f0fdf4", stroke: "#16a34a" },
    library: {
      groupId: "architecture",
      icon: "arch_service",
      keywords: ["service"],
      width: 140,
      height: 86,
    },
  },
  {
    tool: TOOL_NAME.ARCH_DEVICE,
    label: "设备",
    registration: { type: "flow-node", kind: "archDevice", fill: "#f8fafc", stroke: "#334155" },
    library: {
      groupId: "architecture",
      icon: "arch_device",
      keywords: ["device"],
      width: 126,
      height: 94,
    },
  },
];

export const shapeLibraryGroups: ShapeLibraryGroup[] = Object.entries(toolGroupTitles).map(
  ([id, title]) => ({
    id,
    title,
    items: toolDefinitions
      .filter((definition) => definition.library?.groupId === id)
      .map((definition) => ({
        tool: definition.tool,
        icon: definition.library!.icon,
        label: definition.label,
        keywords: definition.library!.keywords,
        width: definition.library!.width,
        height: definition.library!.height,
      })),
  }),
);
