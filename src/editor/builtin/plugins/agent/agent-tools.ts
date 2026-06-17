import type Editor from "../../../editor";
import { ACTION_NAME, TOOL_NAME } from "../../../constants";

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (editor: Editor, args: Record<string, unknown>) => Promise<string> | string;
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
              "text",
              "flow_start_end",
              "flow_process",
              "flow_decision",
              "flow_io",
              "flow_document",
              "flow_database",
              "flow_subprocess",
              "flow_swimlane",
              "bpmn_start_event",
              "bpmn_end_event",
              "bpmn_task",
              "bpmn_exclusive_gateway",
              "arch_actor",
              "arch_component",
              "arch_package",
              "arch_node",
              "arch_cloud",
              "arch_service",
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
          text: TOOL_NAME.DRAW_TEXT,
          flow_start_end: TOOL_NAME.FLOW_START_END,
          flow_process: TOOL_NAME.FLOW_PROCESS,
          flow_decision: TOOL_NAME.FLOW_DECISION,
          flow_io: TOOL_NAME.FLOW_IO,
          flow_document: TOOL_NAME.FLOW_DOCUMENT,
          flow_database: TOOL_NAME.FLOW_DATABASE,
          flow_subprocess: TOOL_NAME.FLOW_SUBPROCESS,
          flow_swimlane: TOOL_NAME.FLOW_SWIMLANE,
          bpmn_start_event: TOOL_NAME.BPMN_START_EVENT,
          bpmn_end_event: TOOL_NAME.BPMN_END_EVENT,
          bpmn_task: TOOL_NAME.BPMN_TASK,
          bpmn_exclusive_gateway: TOOL_NAME.BPMN_EXCLUSIVE_GATEWAY,
          arch_actor: TOOL_NAME.ARCH_ACTOR,
          arch_component: TOOL_NAME.ARCH_COMPONENT,
          arch_package: TOOL_NAME.ARCH_PACKAGE,
          arch_node: TOOL_NAME.ARCH_NODE,
          arch_cloud: TOOL_NAME.ARCH_CLOUD,
          arch_service: TOOL_NAME.ARCH_SERVICE,
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

    // 模板插入
    {
      name: "insert_template",
      description: "插入预设模板",
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
        },
        required: ["template_type"],
      },
      execute: async (editor, args) => {
        const templateType = args.template_type as string;
        const actionMap: Record<string, string> = {
          approval: ACTION_NAME.TEMPLATE_APPROVAL,
          decision: ACTION_NAME.TEMPLATE_DECISION,
          workOrder: ACTION_NAME.TEMPLATE_WORK_ORDER,
          crm: ACTION_NAME.TEMPLATE_CRM,
          login: ACTION_NAME.TEMPLATE_LOGIN,
          payment: ACTION_NAME.TEMPLATE_PAYMENT,
          bpmnOrder: ACTION_NAME.TEMPLATE_BPMN_ORDER,
          systemArchitecture: ACTION_NAME.TEMPLATE_SYSTEM_ARCHITECTURE,
          swimlaneCollaboration: ACTION_NAME.TEMPLATE_SWIMLANE_COLLABORATION,
        };
        const action = actionMap[templateType];
        if (!action) return `不支持的模板类型: ${templateType}`;
        const result = await editor.commands.execute(action);
        return result.message;
      },
    },

    // 样式修改
    {
      name: "set_style",
      description: "修改选中元素的样式",
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
        },
        required: [],
      },
      execute: (editor, args) => {
        const selected = editor.app.editor.list;
        if (!selected || selected.length === 0) {
          return "请先选中要修改样式的元素";
        }

        selected.forEach((element) => {
          if (typeof args.fill === "string") {
            element.fill = args.fill;
          }
          if (typeof args.stroke === "string") {
            element.stroke = args.stroke;
          }
          if (typeof args.stroke_width === "number") {
            element.strokeWidth = args.stroke_width;
          }
          if (typeof args.opacity === "number") {
            element.opacity = args.opacity;
          }
        });

        editor.commitMutation();
        return `已修改 ${selected.length} 个元素的样式`;
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
