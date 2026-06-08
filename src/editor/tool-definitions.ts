import type { IconName } from "../assets/icons";
import { TOOL_NAME, type ToolName } from "./constants";
import type { FlowNodeKind } from "./tools/draw-flow-node";

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

type ToolGroupId = "basic" | "flow" | "bpmn" | "architecture";
type ToolbarGroupId = "core" | "shapes" | ToolGroupId;
type ClassToolKind = "rect" | "arrow" | "circle" | "diamond" | "text" | "freehand";

interface ToolLibraryConfig {
  groupId: ToolGroupId;
  groupTitle: string;
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
  toolbarGroupId?: ToolbarGroupId;
  toolbarGroupTitle?: string;
  library?: ToolLibraryConfig;
}

export interface ClassToolDefinition extends BaseToolDefinition {
  registration: Extract<ToolRegistrationConfig, { type: "class" }>;
}

export interface FlowNodeToolDefinition extends BaseToolDefinition {
  registration: Extract<ToolRegistrationConfig, { type: "flow-node" }>;
}

export type ToolDefinition = ClassToolDefinition | FlowNodeToolDefinition;

export const toolDefinitions: ToolDefinition[] = [
  {
    tool: TOOL_NAME.DRAW_RECT,
    label: "矩形",
    registration: { type: "class", toolKind: "rect" },
    library: {
      groupId: "basic",
      groupTitle: "基础图形",
      icon: "draw_rect",
      keywords: ["rect", "rectangle", "矩形", "方形", "节点", "kuang", "juxing", "fangxing"],
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
      groupTitle: "基础图形",
      icon: "draw_circle",
      keywords: ["circle", "ellipse", "圆形", "椭圆", "事件", "yuan", "tuoyuan"],
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
      groupTitle: "基础图形",
      icon: "draw_diamond",
      keywords: ["diamond", "菱形", "判断", "网关", "lingxing", "panduan"],
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
      groupTitle: "基础图形",
      icon: "draw_triangle",
      keywords: ["triangle", "三角形", "sanjiao"],
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
      groupTitle: "基础图形",
      icon: "draw_pentagon",
      keywords: ["pentagon", "五边形", "wubianxing"],
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
      groupTitle: "基础图形",
      icon: "draw_hexagon",
      keywords: ["hexagon", "六边形", "liubianxing"],
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
      groupTitle: "基础图形",
      icon: "draw_text",
      keywords: ["text", "文本", "文字", "标签", "wenben", "wenzi"],
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
      groupTitle: "基础图形",
      icon: "draw_freehand",
      keywords: ["freehand", "pen", "自由绘制", "手绘", "画笔", "ziyou", "shouhui", "huabi"],
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
      groupTitle: "流程图",
      icon: "flow_start_end",
      keywords: ["start", "end", "开始", "结束", "起止", "kaishi", "jieshu"],
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
      groupTitle: "流程图",
      icon: "flow_process",
      keywords: ["process", "处理", "流程", "步骤", "任务", "chuli", "liucheng", "buzhou"],
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
      groupTitle: "流程图",
      icon: "flow_decision",
      keywords: ["decision", "判断", "条件", "分支", "菱形", "panduan", "tiaojian", "fenzhi"],
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
      groupTitle: "流程图",
      icon: "flow_io",
      keywords: ["input", "output", "输入", "输出", "输入输出", "shuru", "shuchu"],
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
      groupTitle: "流程图",
      icon: "flow_document",
      keywords: ["document", "文档", "文件", "wendang", "wenjian"],
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
      groupTitle: "流程图",
      icon: "flow_database",
      keywords: ["database", "data", "数据库", "数据", "存储", "shujuku", "shuju", "cunchu"],
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
      groupTitle: "流程图",
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
      groupTitle: "流程图",
      icon: "flow_swimlane",
      keywords: ["swimlane", "泳道", "职责", "部门", "yongdao", "zhize", "bumen"],
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
      groupTitle: "流程图",
      icon: "flow_delay",
      keywords: ["delay", "延迟", "等待", "yan chi", "dengdai"],
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
      groupTitle: "流程图",
      icon: "flow_preparation",
      keywords: ["preparation", "准备", "预处理", "zhunbei"],
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
      groupTitle: "流程图",
      icon: "flow_manual_input",
      keywords: ["manual", "input", "手动输入", "人工输入", "shoudong", "rengong"],
      width: 140,
      height: 72,
    },
  },
  {
    tool: TOOL_NAME.FLOW_MANUAL_OPERATION,
    label: "手动操作",
    registration: {
      type: "flow-node",
      kind: "manualOperation",
      fill: "#f5f3ff",
      stroke: "#7c3aed",
    },
    library: {
      groupId: "flow",
      groupTitle: "流程图",
      icon: "flow_manual_operation",
      keywords: ["manual", "operation", "手动操作", "人工操作", "shoudong", "rengong"],
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
      groupTitle: "流程图",
      icon: "flow_stored_data",
      keywords: ["stored", "data", "存储数据", "数据存储", "cunchu", "shuju"],
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
      groupTitle: "流程图",
      icon: "flow_display",
      keywords: ["display", "显示", "展示", "xianshi", "zhanshi"],
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
      groupTitle: "流程图",
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
      groupTitle: "流程图",
      icon: "flow_merge",
      keywords: ["merge", "合并", "汇聚", "hebing", "huiju"],
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
      groupTitle: "流程图",
      icon: "flow_annotation",
      keywords: ["annotation", "注释", "备注", "说明", "zhushi", "beizhu", "shuoming"],
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
      groupTitle: "BPMN",
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
      groupTitle: "BPMN",
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
      groupTitle: "BPMN",
      icon: "bpmn_end_event",
      keywords: ["bpmn", "end", "event"],
      width: 90,
      height: 90,
    },
  },
  {
    tool: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
    label: "排他网关",
    registration: {
      type: "flow-node",
      kind: "bpmnExclusiveGateway",
      fill: "#fffbeb",
      stroke: "#d97706",
    },
    library: {
      groupId: "bpmn",
      groupTitle: "BPMN",
      icon: "bpmn_exclusive_gateway",
      keywords: ["bpmn", "exclusive", "gateway"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.BPMN_PARALLEL_GATEWAY,
    label: "并行网关",
    registration: {
      type: "flow-node",
      kind: "bpmnParallelGateway",
      fill: "#eff6ff",
      stroke: "#2563eb",
    },
    library: {
      groupId: "bpmn",
      groupTitle: "BPMN",
      icon: "bpmn_parallel_gateway",
      keywords: ["bpmn", "parallel", "gateway"],
      width: 96,
      height: 96,
    },
  },
  {
    tool: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY,
    label: "包容网关",
    registration: {
      type: "flow-node",
      kind: "bpmnInclusiveGateway",
      fill: "#f5f3ff",
      stroke: "#7c3aed",
    },
    library: {
      groupId: "bpmn",
      groupTitle: "BPMN",
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
      groupTitle: "BPMN",
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
      groupTitle: "BPMN",
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
      groupTitle: "BPMN",
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
      groupTitle: "架构图",
      icon: "arch_actor",
      keywords: ["actor", "user", "用户", "参与者", "角色", "yonghu", "juese"],
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
      groupTitle: "架构图",
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
      groupTitle: "架构图",
      icon: "arch_component",
      keywords: ["component", "组件", "模块", "zujian", "mokuai"],
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
      groupTitle: "架构图",
      icon: "arch_package",
      keywords: ["package", "包", "分组", "bao", "fenzu"],
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
      groupTitle: "架构图",
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
      groupTitle: "架构图",
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
      groupTitle: "架构图",
      icon: "arch_cache",
      keywords: ["cache", "缓存", "redis", "huancun"],
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
      groupTitle: "架构图",
      icon: "arch_cloud",
      keywords: ["cloud", "云", "云服务", "yun"],
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
      groupTitle: "架构图",
      icon: "arch_service",
      keywords: ["service", "服务", "微服务", "接口", "fuwu", "weifuwu", "jiekou"],
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
      groupTitle: "架构图",
      icon: "arch_device",
      keywords: ["device", "设备", "终端", "shebei", "zhongduan"],
      width: 126,
      height: 94,
    },
  },
];
