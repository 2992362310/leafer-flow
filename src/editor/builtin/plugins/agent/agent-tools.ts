import { Text, type IUI } from "leafer";
import type { App } from "leafer";
import { Connector } from "../../../core/connector";
import { createConnector } from "../../../core/flow-serialization";
import type Editor from "../../../editor";
import { ACTION_NAME, TOOL_NAME } from "../../../constants";
import { getTemplateStyle, templateMap } from "../../../templates/defs";
import { insertTemplateFlow } from "../../../templates/insert";

function getChildren(element: IUI): IUI[] | undefined {
  return (element as unknown as { children?: IUI[] }).children;
}

function getShape(element: IUI): IUI | null {
  if (element instanceof Text) return null;
  const children = getChildren(element);
  if (element.tag === "Group" && children?.length) {
    return children.find((child) => !(child instanceof Text)) || children[0] || null;
  }
  return element;
}

function getText(element: IUI): Text | null {
  if (element instanceof Text) return element;
  const children = getChildren(element);
  if (element.tag === "Group" && children?.length) {
    return (children.find((child) => child instanceof Text) as Text) || null;
  }
  return null;
}

function findElement(editor: Editor, identifier: string): IUI | null {
  const children = editor.app.tree.children as IUI[];
  if (!children?.length) return null;

  // 尝试按索引查找
  const index = parseInt(identifier, 10);
  if (!isNaN(index) && index >= 1 && index <= children.length) {
    return children[index - 1];
  }

  // 按名称查找
  const lowerId = identifier.toLowerCase();
  for (const child of children) {
    const name = String(child.name || "").toLowerCase();
    if (name && name.includes(lowerId)) return child;

    // 也检查文字内容
    const text = getText(child);
    if (text && String(text.text || "").toLowerCase().includes(lowerId)) return child;
  }

  return null;
}

function getElementLabel(element: IUI): string {
  if (element.name) return element.name;
  const text = getText(element);
  if (text?.text) return String(text.text).slice(0, 30);
  return element.tag || "未知";
}

function createConnectorForAgent(app: App, fromNode: IUI, toNode: IUI): Connector | null {
  try {
    const connector = createConnector(app);
    const state = {
      mode: "node" as const,
      fromId: fromNode.innerId,
      toId: toNode.innerId,
      routeType: "orthogonal" as const,
    };
    connector.setState(state as never, (id: string | number) => {
      const children = app.tree.children as IUI[];
      return children.find((el) => el.innerId === id || el.id === id) || null;
    });
    return connector;
  } catch (e) {
    console.warn("创建连接线失败", e);
    return null;
  }
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (editor: Editor, args: Record<string, unknown>) => Promise<string> | string;
  category?: string;
}

/**
 * 工具元数据缓存
 * 用于支持工具查询和自省功能
 */
let toolsCache: AgentTool[] | null = null;

/**
 * 工具分类映射
 */
const TOOL_CATEGORIES: Record<string, string> = {
  // 文件操作
  save_file: "file",
  load_file: "file",
  export_png: "file",
  export_svg: "file",

  // 编辑操作
  undo: "edit",
  redo: "edit",
  select_all: "edit",
  deselect_all: "edit",
  delete_selected: "edit",
  duplicate_selected: "edit",

  // 图形操作
  create_shape: "shape",
  batch_create_shapes: "shape",
  delete_shape: "shape",
  move_shape: "shape",
  resize_shape: "shape",
  set_shape_style: "shape",

  // 布局操作
  align_left: "layout",
  align_right: "layout",
  align_top: "layout",
  align_bottom: "layout",
  distribute_horizontally: "layout",
  distribute_vertically: "layout",
  auto_layout: "layout",

  // 模板操作
  insert_template: "template",

  // 文字操作
  edit_text: "text",
  set_text_style: "text",

  // 视图操作
  zoom_fit: "view",
  zoom_in: "view",
  zoom_out: "view",
  zoom_reset: "view",

  // 画布操作
  clear_canvas: "canvas",
  get_canvas_info: "canvas",
  list_elements: "canvas",
  search_elements: "canvas",
  connect_elements: "canvas",

  // 系统工具
  list_tools: "system",
  get_tool_details: "system",
};

/**
 * 获取所有工具的摘要信息（用于 list_tools）
 */
function getToolsSummary(): Array<{ name: string; description: string; category?: string }> {
  if (!toolsCache) {
    toolsCache = getAgentTools();
  }
  return toolsCache.map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: TOOL_CATEGORIES[tool.name] || "other",
  }));
}

/**
 * 获取特定工具的详细信息（用于 get_tool_details）
 */
function getToolDetails(toolName: string): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  category?: string;
} | null {
  if (!toolsCache) {
    toolsCache = getAgentTools();
  }
  const tool = toolsCache.find((t) => t.name === toolName);
  if (!tool) return null;
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    category: TOOL_CATEGORIES[tool.name] || "other",
  };
}

export function getAgentTools(): AgentTool[] {
  return [
    // 文件操作
    {
      name: "save_file",
      description: "保存当前流程图文件",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.SAVE);
        return result.message;
      },
    },
    {
      name: "load_file",
      description: "加载流程图文件",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.LOAD);
        return result.message;
      },
    },
    {
      name: "export_png",
      description: "导出为 PNG 图片",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.EXPORT_PNG);
        return result.message;
      },
    },
    {
      name: "export_svg",
      description: "导出为 SVG 矢量图",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.EXPORT_SVG);
        return result.message;
      },
    },

    // 编辑操作
    {
      name: "undo",
      description: "撤销上一步操作",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.UNDO);
        return result.message;
      },
    },
    {
      name: "redo",
      description: "重做上一步操作",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.REDO);
        return result.message;
      },
    },
    {
      name: "delete",
      description: "删除选中的元素",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.DELETE);
        return result.message;
      },
    },
    {
      name: "copy",
      description: "复制选中的元素",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.COPY);
        return result.message;
      },
    },
    {
      name: "cut",
      description: "剪切选中的元素（复制并删除原元素）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.CUT);
        return result.message;
      },
    },
    {
      name: "paste",
      description: "粘贴复制的元素",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.PASTE);
        return result.message;
      },
    },
    {
      name: "duplicate",
      description: "原位复制选中的元素（复制并粘贴到偏移位置）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.DUPLICATE);
        return result.message;
      },
    },
    {
      name: "select_all",
      description: "选中画布上所有元素",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.SELECT_ALL);
        return result.message;
      },
    },

    // 布局操作
    {
      name: "align",
      description: "对齐选中的元素",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["left", "center", "right", "top", "middle", "bottom"],
            description: "对齐方向",
          },
        },
        required: ["direction"],
      },
      execute: async (editor, args) => {
        const direction = args.direction as string;
        const actionMap: Record<string, string> = {
          left: ACTION_NAME.ALIGN_LEFT,
          center: ACTION_NAME.ALIGN_CENTER,
          right: ACTION_NAME.ALIGN_RIGHT,
          top: ACTION_NAME.ALIGN_TOP,
          middle: ACTION_NAME.ALIGN_MIDDLE,
          bottom: ACTION_NAME.ALIGN_BOTTOM,
        };
        const action = actionMap[direction];
        if (!action) return `不支持的对齐方向: ${direction}`;
        const result = await editor.commands.execute(action);
        return result.message;
      },
    },
    {
      name: "distribute",
      description: "均匀分布选中的元素",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["horizontal", "vertical"],
            description: "分布方向",
          },
        },
        required: ["direction"],
      },
      execute: async (editor, args) => {
        const direction = args.direction as string;
        const action =
          direction === "horizontal"
            ? ACTION_NAME.DISTRIBUTE_HORIZONTAL
            : ACTION_NAME.DISTRIBUTE_VERTICAL;
        const result = await editor.commands.execute(action);
        return result.message;
      },
    },
    {
      name: "group",
      description: "将选中的元素编组",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.GROUP);
        return result.message;
      },
    },
    {
      name: "ungroup",
      description: "取消选中的编组",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.UNGROUP);
        return result.message;
      },
    },

    // 图层操作
    {
      name: "bring_forward",
      description: "将选中的元素上移一层",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.BRING_FORWARD);
        return result.message;
      },
    },
    {
      name: "send_backward",
      description: "将选中的元素下移一层",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.SEND_BACKWARD);
        return result.message;
      },
    },
    {
      name: "bring_to_front",
      description: "将选中的元素置于顶层",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.BRING_TO_FRONT);
        return result.message;
      },
    },
    {
      name: "send_to_back",
      description: "将选中的元素置于底层",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.SEND_TO_BACK);
        return result.message;
      },
    },

    // 图形创建
    {
      name: "create_shape",
      description: "在画布上创建图形",
      parameters: {
        type: "object",
        properties: {
          shape_type: {
            type: "string",
            enum: [
              "rect",
              "circle",
              "diamond",
              "triangle",
              "pentagon",
              "hexagon",
              "parallelogram",
              "star",
              "note",
              "cylinder",
              "text",
              "flow_start_end",
              "flow_process",
              "flow_decision",
              "flow_io",
              "flow_document",
              "flow_database",
              "flow_subprocess",
              "flow_swimlane",
              "flow_delay",
              "flow_preparation",
              "flow_manual_input",
              "flow_manual_operation",
              "flow_stored_data",
              "flow_display",
              "flow_off_page",
              "flow_merge",
              "flow_annotation",
              "bpmn_start_event",
              "bpmn_intermediate_event",
              "bpmn_end_event",
              "bpmn_task",
              "bpmn_exclusive_gateway",
              "bpmn_parallel_gateway",
              "bpmn_inclusive_gateway",
              "bpmn_data_object",
              "bpmn_data_store",
              "arch_actor",
              "arch_use_case",
              "arch_component",
              "arch_package",
              "arch_node",
              "arch_queue",
              "arch_cache",
              "arch_cloud",
              "arch_service",
              "arch_device",
              "arrow",
              "freehand",
            ],
            description: "图形类型",
          },
          x: {
            type: "number",
            description: "X 坐标（可选，默认画布中心）",
          },
          y: {
            type: "number",
            description: "Y 坐标（可选，默认画布中心）",
          },
          width: {
            type: "number",
            description: "宽度（可选）",
          },
          height: {
            type: "number",
            description: "高度（可选）",
          },
          text: {
            type: "string",
            description: "图形内的文本（可选）",
          },
        },
        required: ["shape_type"],
      },
      execute: (editor, args) => {
        const shapeType = args.shape_type as string;
        const toolMap: Record<string, string> = {
          rect: TOOL_NAME.DRAW_RECT,
          circle: TOOL_NAME.DRAW_CIRCLE,
          diamond: TOOL_NAME.DRAW_DIAMOND,
          triangle: TOOL_NAME.DRAW_TRIANGLE,
          pentagon: TOOL_NAME.DRAW_PENTAGON,
          hexagon: TOOL_NAME.DRAW_HEXAGON,
          parallelogram: TOOL_NAME.DRAW_PARALLELOGRAM,
          star: TOOL_NAME.DRAW_STAR,
          note: TOOL_NAME.DRAW_NOTE,
          cylinder: TOOL_NAME.DRAW_CYLINDER,
          text: TOOL_NAME.DRAW_TEXT,
          flow_start_end: TOOL_NAME.FLOW_START_END,
          flow_process: TOOL_NAME.FLOW_PROCESS,
          flow_decision: TOOL_NAME.FLOW_DECISION,
          flow_io: TOOL_NAME.FLOW_IO,
          flow_document: TOOL_NAME.FLOW_DOCUMENT,
          flow_database: TOOL_NAME.FLOW_DATABASE,
          flow_subprocess: TOOL_NAME.FLOW_SUBPROCESS,
          flow_swimlane: TOOL_NAME.FLOW_SWIMLANE,
          flow_delay: TOOL_NAME.FLOW_DELAY,
          flow_preparation: TOOL_NAME.FLOW_PREPARATION,
          flow_manual_input: TOOL_NAME.FLOW_MANUAL_INPUT,
          flow_manual_operation: TOOL_NAME.FLOW_MANUAL_OPERATION,
          flow_stored_data: TOOL_NAME.FLOW_STORED_DATA,
          flow_display: TOOL_NAME.FLOW_DISPLAY,
          flow_off_page: TOOL_NAME.FLOW_OFF_PAGE,
          flow_merge: TOOL_NAME.FLOW_MERGE,
          flow_annotation: TOOL_NAME.FLOW_ANNOTATION,
          bpmn_start_event: TOOL_NAME.BPMN_START_EVENT,
          bpmn_intermediate_event: TOOL_NAME.BPMN_INTERMEDIATE_EVENT,
          bpmn_end_event: TOOL_NAME.BPMN_END_EVENT,
          bpmn_task: TOOL_NAME.BPMN_TASK,
          bpmn_exclusive_gateway: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
          bpmn_parallel_gateway: TOOL_NAME.BPMN_PARALLEL_GATEWAY,
          bpmn_inclusive_gateway: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY,
          bpmn_data_object: TOOL_NAME.BPMN_DATA_OBJECT,
          bpmn_data_store: TOOL_NAME.BPMN_DATA_STORE,
          arch_actor: TOOL_NAME.ARCH_ACTOR,
          arch_use_case: TOOL_NAME.ARCH_USE_CASE,
          arch_component: TOOL_NAME.ARCH_COMPONENT,
          arch_package: TOOL_NAME.ARCH_PACKAGE,
          arch_node: TOOL_NAME.ARCH_NODE,
          arch_queue: TOOL_NAME.ARCH_QUEUE,
          arch_cache: TOOL_NAME.ARCH_CACHE,
          arch_cloud: TOOL_NAME.ARCH_CLOUD,
          arch_service: TOOL_NAME.ARCH_SERVICE,
          arch_device: TOOL_NAME.ARCH_DEVICE,
          arrow: TOOL_NAME.DRAW_ARROW,
          freehand: TOOL_NAME.DRAW_FREEHAND,
        };

        const tool = toolMap[shapeType];
        if (!tool) return `不支持的图形类型: ${shapeType}`;

        const x = typeof args.x === "number" ? args.x : 200;
        const y = typeof args.y === "number" ? args.y : 200;
        const width = typeof args.width === "number" ? args.width : 120;
        const height = typeof args.height === "number" ? args.height : 72;

        const element = editor.createElementFromTool(tool, { x, y }, { width, height });
        if (element) {
          return `已创建 ${shapeType} 图形`;
        }
        return `创建 ${shapeType} 图形失败`;
      },
    },

    // 批量创建图形
    {
      name: "batch_create_shapes",
      description: "批量创建多个图形。支持指定每个图形的类型、位置、文本等。网格排列时自动计算位置。",
      parameters: {
        type: "object",
        properties: {
          shape_type: {
            type: "string",
            description: "所有图形的类型（与 create_shape 相同的 enum）",
          },
          count: {
            type: "number",
            description: "创建数量（1-20）",
          },
          texts: {
            type: "array",
            description: "可选的文本数组，对应每个图形。如果少于 count，剩余图形无文本",
            items: { type: "string" },
          },
          start_x: {
            type: "number",
            description: "起始 X 坐标（可选，默认 100）",
          },
          start_y: {
            type: "number",
            description: "起始 Y 坐标（可选，默认 100）",
          },
          width: {
            type: "number",
            description: "每个图形的宽度（可选，默认 120）",
          },
          height: {
            type: "number",
            description: "每个图形的高度（可选，默认 72）",
          },
          spacing_x: {
            type: "number",
            description: "水平间距（可选，默认 150）",
          },
          spacing_y: {
            type: "number",
            description: "垂直间距（可选，默认 100）",
          },
          columns: {
            type: "number",
            description: "网格列数。0 表示水平排列（可选，默认 5）",
          },
        },
        required: ["shape_type", "count"],
      },
      execute: (editor, args) => {
        const shapeType = args.shape_type as string;
        const count = Math.max(1, Math.min(20, typeof args.count === "number" ? args.count : 1));
        const texts = Array.isArray(args.texts) ? (args.texts as string[]) : [];
        const startX = typeof args.start_x === "number" ? args.start_x : 100;
        const startY = typeof args.start_y === "number" ? args.start_y : 100;
        const width = typeof args.width === "number" ? args.width : 120;
        const height = typeof args.height === "number" ? args.height : 72;
        const spacingX = typeof args.spacing_x === "number" ? args.spacing_x : 150;
        const spacingY = typeof args.spacing_y === "number" ? args.spacing_y : 100;
        const columns = Math.max(1, typeof args.columns === "number" ? args.columns : 5);

        const toolMap: Record<string, string> = {
          rect: TOOL_NAME.DRAW_RECT,
          circle: TOOL_NAME.DRAW_CIRCLE,
          diamond: TOOL_NAME.DRAW_DIAMOND,
          triangle: TOOL_NAME.DRAW_TRIANGLE,
          pentagon: TOOL_NAME.DRAW_PENTAGON,
          hexagon: TOOL_NAME.DRAW_HEXAGON,
          parallelogram: TOOL_NAME.DRAW_PARALLELOGRAM,
          star: TOOL_NAME.DRAW_STAR,
          note: TOOL_NAME.DRAW_NOTE,
          cylinder: TOOL_NAME.DRAW_CYLINDER,
          text: TOOL_NAME.DRAW_TEXT,
          flow_start_end: TOOL_NAME.FLOW_START_END,
          flow_process: TOOL_NAME.FLOW_PROCESS,
          flow_decision: TOOL_NAME.FLOW_DECISION,
          flow_io: TOOL_NAME.FLOW_IO,
          flow_document: TOOL_NAME.FLOW_DOCUMENT,
          flow_database: TOOL_NAME.FLOW_DATABASE,
          flow_subprocess: TOOL_NAME.FLOW_SUBPROCESS,
          flow_swimlane: TOOL_NAME.FLOW_SWIMLANE,
          flow_delay: TOOL_NAME.FLOW_DELAY,
          flow_preparation: TOOL_NAME.FLOW_PREPARATION,
          flow_manual_input: TOOL_NAME.FLOW_MANUAL_INPUT,
          flow_manual_operation: TOOL_NAME.FLOW_MANUAL_OPERATION,
          flow_stored_data: TOOL_NAME.FLOW_STORED_DATA,
          flow_display: TOOL_NAME.FLOW_DISPLAY,
          flow_off_page: TOOL_NAME.FLOW_OFF_PAGE,
          flow_merge: TOOL_NAME.FLOW_MERGE,
          flow_annotation: TOOL_NAME.FLOW_ANNOTATION,
          bpmn_start_event: TOOL_NAME.BPMN_START_EVENT,
          bpmn_intermediate_event: TOOL_NAME.BPMN_INTERMEDIATE_EVENT,
          bpmn_end_event: TOOL_NAME.BPMN_END_EVENT,
          bpmn_task: TOOL_NAME.BPMN_TASK,
          bpmn_exclusive_gateway: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
          bpmn_parallel_gateway: TOOL_NAME.BPMN_PARALLEL_GATEWAY,
          bpmn_inclusive_gateway: TOOL_NAME.BPMN_INCLUSIVE_GATEWAY,
          bpmn_data_object: TOOL_NAME.BPMN_DATA_OBJECT,
          bpmn_data_store: TOOL_NAME.BPMN_DATA_STORE,
          arch_actor: TOOL_NAME.ARCH_ACTOR,
          arch_use_case: TOOL_NAME.ARCH_USE_CASE,
          arch_component: TOOL_NAME.ARCH_COMPONENT,
          arch_package: TOOL_NAME.ARCH_PACKAGE,
          arch_node: TOOL_NAME.ARCH_NODE,
          arch_queue: TOOL_NAME.ARCH_QUEUE,
          arch_cache: TOOL_NAME.ARCH_CACHE,
          arch_cloud: TOOL_NAME.ARCH_CLOUD,
          arch_service: TOOL_NAME.ARCH_SERVICE,
          arch_device: TOOL_NAME.ARCH_DEVICE,
          arrow: TOOL_NAME.DRAW_ARROW,
          freehand: TOOL_NAME.DRAW_FREEHAND,
        };

        const tool = toolMap[shapeType];
        if (!tool) return `不支持的图形类型: ${shapeType}`;

        let created = 0;
        editor.beginTransaction();

        try {
          for (let i = 0; i < count; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;
            const text = texts[i];

            const element = editor.createElementFromTool(tool, { x, y }, { width, height });
            if (element && text) {
              // 设置文本：大部分图形是 Group，找到子元素中的 Text
              const children = (element as unknown as { children?: unknown[] }).children;
              if (children) {
                const textChild = children.find((child) => (child as unknown as { text?: string }).text !== undefined);
                if (textChild) {
                  (textChild as unknown as { text: string }).text = text;
                }
              }
            }
            if (element) created++;
          }

          editor.commitMutation();
          return `已批量创建 ${created}/${count} 个 ${shapeType} 图形`;
        } catch (error) {
          editor.endTransaction();
          return `批量创建失败: ${error instanceof Error ? error.message : "未知错误"}`;
        }
      },
    },

    // 模板插入
    {
      name: "insert_template",
      description: "插入预设模板，支持自定义位置和缩放",
      parameters: {
        type: "object",
        properties: {
          template_type: {
            type: "string",
            enum: [
              "approval",
              "decision",
              "workOrder",
              "crm",
              "login",
              "payment",
              "bpmnOrder",
              "systemArchitecture",
              "swimlaneCollaboration",
            ],
            description: "模板类型",
          },
          offset_x: {
            type: "number",
            description: "水平位置偏移（可选，默认为 100）",
          },
          offset_y: {
            type: "number",
            description: "垂直位置偏移（可选，默认为 80）",
          },
          scale: {
            type: "number",
            description: "缩放因子（可选，默认为 1，范围 0.5-2）",
          },
        },
        required: ["template_type"],
      },
      execute: async (editor, args) => {
        const templateType = args.template_type as string;
        const offsetX = typeof args.offset_x === "number" ? args.offset_x : 100;
        const offsetY = typeof args.offset_y === "number" ? args.offset_y : 80;
        const scale = Math.max(0.5, Math.min(2, typeof args.scale === "number" ? args.scale : 1));

        if (!templateMap[templateType as never]) {
          return `不支持的模板类型: ${templateType}`;
        }

        try {
          editor.beginTransaction();
          const data = templateMap[templateType as never]();

          // 应用位置偏移和缩放
          const transformedGraph = {
            nodes: data.graph.nodes.map((node) => ({
              ...node,
              x: node.x * scale + offsetX,
              y: node.y * scale + offsetY,
              width: node.width * scale,
              height: node.height * scale,
            })),
            edges: data.graph.edges.map((edge) => ({ ...edge })),
          };

          insertTemplateFlow(editor.app, transformedGraph, getTemplateStyle);
          editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
          editor.endTransaction();
          await editor.autoSave.save();

          const scaleStr = scale !== 1 ? ` (缩放 ${Math.round(scale * 100)}%)` : "";
          return `已插入 ${templateType} 模板${scaleStr}`;
        } catch (error) {
          editor.endTransaction();
          return `模板插入失败: ${error instanceof Error ? error.message : "未知错误"}`;
        }
      },
    },

    // 属性修改
    {
      name: "set_style",
      description: "修改选中元素的属性，包括样式（填充、边框、透明度）、位置（x, y）、尺寸（宽高）、圆角等。注意：大部分图形是 Group（包含形状子元素和文字子元素），样式属性会自动应用到形状子元素。",
      parameters: {
        type: "object",
        properties: {
          fill: {
            type: "string",
            description: "填充颜色（如 #ff0000 或 red）",
          },
          stroke: {
            type: "string",
            description: "边框颜色",
          },
          stroke_width: {
            type: "number",
            description: "边框宽度",
          },
          opacity: {
            type: "number",
            description: "透明度（0-1）",
          },
          x: {
            type: "number",
            description: "X 坐标位置",
          },
          y: {
            type: "number",
            description: "Y 坐标位置",
          },
          width: {
            type: "number",
            description: "宽度（最小值为 1）",
          },
          height: {
            type: "number",
            description: "高度（最小值为 1）",
          },
          rotation: {
            type: "number",
            description: "旋转角度（度数）",
          },
          corner_radius: {
            type: "number",
            description: "圆角半径",
          },
        },
        required: [],
      },
      execute: (editor, args) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return "请先选中要修改的元素";
        }

        selected.forEach((element) => {
          // 位置
          if (typeof args.x === "number") {
            element.x = args.x;
          }
          if (typeof args.y === "number") {
            element.y = args.y;
          }

          // 尺寸
          if (typeof args.width === "number") {
            element.width = Math.max(1, args.width);
          }
          if (typeof args.height === "number") {
            element.height = Math.max(1, args.height);
          }

          // 旋转
          if (typeof args.rotation === "number") {
            element.rotation = args.rotation;
          }

          // 样式属性：应用到形状子元素（Group 的子元素）
          const shape = getShape(element);
          if (shape) {
            if (typeof args.fill === "string") {
              shape.fill = args.fill;
            }
            if (typeof args.stroke === "string") {
              shape.stroke = args.stroke;
            }
            if (typeof args.stroke_width === "number") {
              shape.strokeWidth = args.stroke_width;
            }
            if (typeof args.opacity === "number") {
              shape.opacity = args.opacity;
            }
            if (typeof args.corner_radius === "number") {
              shape.cornerRadius = args.corner_radius;
            }
          }
        });

        editor.commitMutation();
        return `已修改 ${selected.length} 个元素的属性`;
      },
    },

    // 文字修改
    {
      name: "modify_text",
      description: "修改选中元素的文字内容或文字样式。大部分图形是 Group，包含形状子元素和文字子元素，本工具会自动找到文字子元素进行修改。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "文字内容",
          },
          font_size: {
            type: "number",
            description: "字号（如 14）",
          },
          text_color: {
            type: "string",
            description: "文字颜色（如 #000000）",
          },
        },
        required: [],
      },
      execute: (editor, args) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return "请先选中要修改文字的元素";
        }

        let modified = 0;
        selected.forEach((element) => {
          const text = getText(element);
          if (!text) return;

          if (typeof args.text === "string") {
            text.text = args.text;
          }
          if (typeof args.font_size === "number") {
            text.fontSize = args.font_size;
          }
          if (typeof args.text_color === "string") {
            text.fill = args.text_color;
          }
          modified++;
        });

        if (modified === 0) {
          return "选中的元素中没有可修改的文字元素";
        }

        editor.commitMutation();
        return `已修改 ${modified} 个元素的文字`;
      },
    },

    // 视图控制
    {
      name: "zoom_fit",
      description: "适应画布内容",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.VIEW_FIT);
        return result.message;
      },
    },
    {
      name: "zoom_in",
      description: "放大画布",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.ZOOM_IN);
        return result.message;
      },
    },
    {
      name: "zoom_out",
      description: "缩小画布",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.ZOOM_OUT);
        return result.message;
      },
    },
    {
      name: "zoom_reset",
      description: "重置缩放为 100%",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.ZOOM_RESET);
        return result.message;
      },
    },

    // 画布操作
    {
      name: "clear_canvas",
      description: "清空画布上的所有元素",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async (editor) => {
        const result = await editor.commands.execute(ACTION_NAME.CLEAR_CANVAS);
        return result.message;
      },
    },
    {
      name: "get_canvas_info",
      description: "获取画布信息（元素数量、缩放比例等）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: (editor) => {
        const elementCount = editor.app.tree.children.length;
        const scale = editor.app.tree.scaleX || 1;
        const zoomPercent = Math.round(scale * 100);
        return `画布上有 ${elementCount} 个元素，当前缩放 ${zoomPercent}%`;
      },
    },
    {
      name: "get_selection_info",
      description: "获取当前选中元素的详细信息（类型、位置、大小、样式、子元素结构等）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: (editor) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return "当前没有选中任何元素";
        }

        const info = selected.map((el, index) => {
          const tag = el.tag || "Unknown";
          const name = el.name || "";
          const x = Math.round(el.x || 0);
          const y = Math.round(el.y || 0);
          const width = Math.round(el.width || 0);
          const height = Math.round(el.height || 0);

          const shape = getShape(el);
          const text = getText(el);

          const fill = shape?.fill || el.fill || "none";
          const stroke = shape?.stroke || el.stroke || "none";
          const strokeWidth = shape?.strokeWidth ?? el.strokeWidth ?? 0;
          const opacity = shape?.opacity ?? el.opacity ?? 1;
          const cornerRadius = shape?.cornerRadius ?? 0;

          let details = `${index + 1}. ${tag}${name ? ` (${name})` : ""} - 位置: (${x}, ${y}), 大小: ${width}x${height}, 填充: ${fill}, 边框: ${stroke}, 边框宽度: ${strokeWidth}, 透明度: ${opacity}`;
          if (cornerRadius) details += `, 圆角: ${cornerRadius}`;

          // 显示子元素结构
          const children = getChildren(el);
          if (tag === "Group" && children?.length) {
            const childInfo: string[] = [];
            if (shape && !(shape instanceof Text)) {
              childInfo.push(`形状子元素(${shape.tag}): 填充=${fill}, 边框=${stroke}`);
            }
            if (text) {
              const textContent = String(text.text ?? "").slice(0, 50);
              childInfo.push(`文字子元素(Text): "${textContent}", 字号=${text.fontSize ?? 14}, 颜色=${text.fill || "#1f2937"}`);
            }
            if (childInfo.length) {
              details += `\n   子结构: ${childInfo.join("; ")}`;
            }
          }

          return details;
        });

        return `已选中 ${selected.length} 个元素:\n${info.join("\n")}`;
      },
    },

    // 搜索与连接
    {
      name: "search_elements",
      description: "搜索画布上的元素。可按文字内容、元素类型（tag）或名称搜索，返回匹配的元素列表及其位置信息。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词，匹配元素的文字内容、name 或 tag",
          },
        },
        required: ["query"],
      },
      execute: (editor, args) => {
        const query = String(args.query || "").toLowerCase();
        if (!query) return "请提供搜索关键词";

        const results: string[] = [];
        const tree = editor.app.tree;

        function searchChildren(children: unknown[], depth: number) {
          for (const child of children) {
            const el = child as Record<string, unknown>;
            const tag = String(el.tag || "");
            const name = String(el.name || "");
            const text = String(el.text || "");
            const innerText = getInnerText(el);

            const match =
              tag.toLowerCase().includes(query) ||
              name.toLowerCase().includes(query) ||
              text.toLowerCase().includes(query) ||
              innerText.toLowerCase().includes(query);

            if (match) {
              const x = Math.round((el.x as number) || 0);
              const y = Math.round((el.y as number) || 0);
              const w = Math.round((el.width as number) || 0);
              const h = Math.round((el.height as number) || 0);
              results.push(
                `${results.length + 1}. ${tag}${name ? ` (${name})` : ""}${innerText ? ` "${innerText}"` : ""} - 位置: (${x}, ${y}), 大小: ${w}x${h}`,
              );
            }

            const children = (el as { children?: unknown[] }).children;
            if (children?.length) searchChildren(children, depth + 1);
          }
        }

        function getInnerText(el: Record<string, unknown>): string {
          const text = el.text;
          if (typeof text === "string" && text) return text.slice(0, 40);
          const children = (el as { children?: unknown[] }).children;
          if (children) {
            for (const child of children) {
              const t = (child as Record<string, unknown>).text;
              if (typeof t === "string" && t) return t.slice(0, 40);
            }
          }
          return "";
        }

        searchChildren(tree.children as unknown[], 0);

        if (results.length === 0) {
          return `未找到匹配 "${args.query}" 的元素`;
        }
        return `找到 ${results.length} 个匹配元素:\n${results.join("\n")}`;
      },
    },
    {
      name: "connect_elements",
      description: "用连接线连接两个元素。通过元素名称或在画布中的索引指定起始和目标元素。",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "起始元素的名称或索引（如 '矩形' 或 '1'）",
          },
          to: {
            type: "string",
            description: "目标元素的名称或索引（如 '圆形' 或 '2'）",
          },
        },
        required: ["from", "to"],
      },
      execute: (editor, args) => {
        const fromStr = String(args.from || "");
        const toStr = String(args.to || "");

        const fromEl = findElement(editor, fromStr);
        const toEl = findElement(editor, toStr);

        if (!fromEl) return `未找到起始元素: ${fromStr}`;
        if (!toEl) return `未找到目标元素: ${toStr}`;

        const connector = createConnectorForAgent(editor.app, fromEl, toEl);
        if (!connector) return "创建连接线失败";

        editor.app.tree.add(connector);
        editor.commitMutation({ syncConnectorLabels: true });
        return `已连接 "${getElementLabel(fromEl)}" 和 "${getElementLabel(toEl)}"`;
      },
    },

    // 工具查询与自省
    {
      name: "list_tools",
      description: "列出所有可用的 Agent 工具及其简要描述。用于了解 Agent 的能力。",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "可选：按分类筛选工具。可选值: file(文件), edit(编辑), shape(图形), layout(布局), template(模板), text(文字), view(视图), canvas(画布), system(系统)",
          },
        },
        required: [],
      },
      category: "system",
      execute: (editor, args) => {
        const tools = getToolsSummary();
        const filterCategory = args.category ? String(args.category).trim().toLowerCase() : null;

        let filtered = tools;
        if (filterCategory) {
          filtered = tools.filter((t) => (t.category || "other").toLowerCase() === filterCategory);
          if (filtered.length === 0) {
            const available = [...new Set(tools.map((t) => t.category || "other"))].join(", ");
            return `分类 "${filterCategory}" 中没有工具。\n可用分类: ${available}`;
          }
        }

        const categories = [...new Set(filtered.map((t) => t.category || "other"))].sort();
        const result = [
          filterCategory
            ? `【${filterCategory}】分类工具 (${filtered.length} 个):`
            : `当前 Agent 拥有 ${tools.length} 个工具，分为 ${categories.length} 个分类:`,
          "",
          ...categories.map((cat) => {
            const toolsInCat = filtered.filter((t) => (t.category || "other") === cat);
            return `【${cat}】(${toolsInCat.length} 个)\n${toolsInCat.map((t) => `  ✓ ${t.name}: ${t.description}`).join("\n")}`;
          }),
          "",
          "💡 用法:",
          "  - 获取所有工具：list_tools",
          "  - 按分类过滤：list_tools category=shape",
          "  - 查看工具详情：get_tool_details tool_name=create_shape",
        ];
        return result.join("\n");
      },
    },
    {
      name: "get_tool_details",
      description:
        "获取指定工具的详细信息，包括参数说明和可选值。用于了解如何使用某个工具。",
      parameters: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description: "工具名称（如 'create_shape', 'insert_template'）",
          },
        },
        required: ["tool_name"],
      },
      category: "system",
      execute: (editor, args) => {
        const toolName = String(args.tool_name || "").trim();
        if (!toolName) {
          return "错误：请指定工具名称";
        }

        const details = getToolDetails(toolName);
        if (!details) {
          return `未找到工具 "${toolName}"。使用 list_tools 查看所有可用工具。`;
        }

        const lines = [
          `📋 工具详情: ${details.name}`,
          `分类: ${details.category || "其他"}`,
          `描述: ${details.description}`,
          "",
          "参数:",
        ];

        const props = (details.parameters as any)?.properties || {};
        const required = (details.parameters as any)?.required || [];

        if (Object.keys(props).length === 0) {
          lines.push("  (无参数)");
        } else {
          Object.entries(props).forEach(([key, prop]: [string, any]) => {
            const isRequired = required.includes(key) ? "✓ 必需" : "○ 可选";
            const type = prop.type || "any";
            const desc = prop.description || "无描述";
            lines.push(`  - ${key} (${type}) ${isRequired}`);
            lines.push(`    ${desc}`);
            if (prop.enum) {
              lines.push(`    可选值: ${prop.enum.join(", ")}`);
            }
          });
        }

        return lines.join("\n");
      },
    },
  ];
}

export function getToolsSchema(): Record<string, unknown>[] {
  return getAgentTools().map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
