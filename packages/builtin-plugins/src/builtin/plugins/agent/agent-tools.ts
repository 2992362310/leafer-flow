import type Editor from "@leafer-flow/core/editor";
import type { DocumentNode } from "@leafer-flow/core";
import { ACTION_NAME, TOOL_NAME } from "@leafer-flow/core/constants";
import { getTemplateStyle, templateMap } from "../../../templates/defs";
import { insertTemplateFlow } from "../../../templates/insert";
import { TemplateRegistry } from "../../templates/registry";

const SHAPE_TOOLS: Record<string, string> = {
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

const TARGET_IDS_PARAMETER: ToolParameter = {
  type: "array",
  items: { type: "string" },
  minItems: 1,
  description: "目标文档 ID 列表，来自搜索或创建结果；省略时使用当前选区",
};

function getTargetIds(editor: Editor, args: Record<string, unknown>): string[] {
  if (args.ids === undefined) {
    return (editor.app.editor.list ?? []).map((element) => editor.renderer.getId(element));
  }
  if (
    !Array.isArray(args.ids) ||
    !args.ids.length ||
    args.ids.some((id) => typeof id !== "string" || !id)
  ) {
    throw new Error("ids 必须是非空文档 ID 数组");
  }
  const ids = [...new Set(args.ids as string[])];
  const edges = new Set(editor.document.snapshot().edges.map((edge) => edge.id));
  for (const id of ids) {
    if (!editor.document.getNode(id) && !edges.has(id)) throw new Error(`目标不存在: ${id}`);
  }
  return ids;
}

type ToolCategory =
  "file" | "edit" | "shape" | "layout" | "template" | "text" | "view" | "canvas" | "system";

interface ToolParameter {
  type: "string" | "number" | "integer" | "array";
  description?: string;
  enum?: string[];
  items?: ToolParameter;
  minimum?: number;
  maximum?: number;
  minItems?: number;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, ToolParameter>; required?: string[] };
  execute: (editor: Editor, args: Record<string, unknown>) => Promise<string> | string;
  category: ToolCategory;
}

export function validateToolArguments(tool: AgentTool, args: Record<string, unknown>) {
  const validate = (name: string, value: unknown, rule: ToolParameter) => {
    if (rule.type === "array") {
      if (!Array.isArray(value) || value.length < (rule.minItems ?? 0))
        throw new Error(`无效的数组参数: ${name}`);
      const itemRule = rule.items;
      if (itemRule) value.forEach((item) => validate(name, item, itemRule));
    } else if (rule.type === "number" || rule.type === "integer") {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (rule.type === "integer" && !Number.isInteger(value)) ||
        value < (rule.minimum ?? -Infinity) ||
        value > (rule.maximum ?? Infinity)
      )
        throw new Error(`无效的数值参数: ${name}`);
    } else if (typeof value !== "string") throw new Error(`无效的字符串参数: ${name}`);
    if (rule.enum && !rule.enum.includes(String(value))) throw new Error(`不支持的参数值: ${name}`);
  };
  for (const name of tool.parameters.required ?? []) {
    if (args[name] === undefined) throw new Error(`缺少参数: ${name}`);
  }
  for (const [name, value] of Object.entries(args)) {
    const rule = tool.parameters.properties[name];
    if (!rule) throw new Error(`未知参数: ${name}`);
    validate(name, value, rule);
  }
}

async function executeCommand(editor: Editor, id: string) {
  const result = await editor.commands.execute(id);
  if (!result.success) throw new Error(result.message);
  return result.message;
}

function commandTool(
  name: string,
  description: string,
  category: ToolCategory,
  id: string,
): AgentTool {
  return {
    name,
    description,
    category,
    parameters: { type: "object", properties: {} },
    execute: (editor) => executeCommand(editor, id),
  };
}

const AGENT_TOOLS: AgentTool[] = [
  // 文件操作
  commandTool("save_file", "保存当前流程图文件", "file", ACTION_NAME.SAVE),
  commandTool("load_file", "加载流程图文件", "file", ACTION_NAME.LOAD),
  commandTool("export_png", "导出为 PNG 图片", "file", ACTION_NAME.EXPORT_PNG),
  commandTool("export_svg", "导出为 SVG 矢量图", "file", ACTION_NAME.EXPORT_SVG),

  // 编辑操作
  commandTool("undo", "撤销上一步操作", "edit", ACTION_NAME.UNDO),
  commandTool("redo", "重做上一步操作", "edit", ACTION_NAME.REDO),
  commandTool("delete", "删除选中的元素", "edit", ACTION_NAME.DELETE),
  commandTool("copy", "复制选中的元素", "edit", ACTION_NAME.COPY),
  commandTool("cut", "剪切选中的元素", "edit", ACTION_NAME.CUT),
  commandTool("paste", "粘贴复制的元素", "edit", ACTION_NAME.PASTE),
  commandTool("duplicate", "复制选中元素到偏移位置", "edit", ACTION_NAME.DUPLICATE),
  commandTool("select_all", "选中画布上所有元素", "edit", ACTION_NAME.SELECT_ALL),

  // 布局操作
  {
    name: "align",
    category: "layout",
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
      if (!action) throw new Error(`不支持的对齐方向: ${direction}`);
      return executeCommand(editor, action);
    },
  },
  {
    name: "distribute",
    category: "layout",
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
      return executeCommand(editor, action);
    },
  },
  commandTool("group", "将选中的元素编组", "layout", ACTION_NAME.GROUP),
  commandTool("ungroup", "取消选中的编组", "layout", ACTION_NAME.UNGROUP),

  // 图层操作
  commandTool("bring_forward", "将选中的元素上移一层", "layout", ACTION_NAME.BRING_FORWARD),
  commandTool("send_backward", "将选中的元素下移一层", "layout", ACTION_NAME.SEND_BACKWARD),
  commandTool("bring_to_front", "将选中的元素置于顶层", "layout", ACTION_NAME.BRING_TO_FRONT),
  commandTool("send_to_back", "将选中的元素置于底层", "layout", ACTION_NAME.SEND_TO_BACK),

  // 图形创建
  {
    name: "create_shape",
    category: "shape",
    description: "在画布上创建图形",
    parameters: {
      type: "object",
      properties: {
        shape_type: {
          type: "string",
          enum: Object.keys(SHAPE_TOOLS),
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
      const tool = SHAPE_TOOLS[shapeType];
      if (!Object.hasOwn(SHAPE_TOOLS, shapeType)) throw new Error(`不支持的图形类型: ${shapeType}`);

      const x = typeof args.x === "number" ? args.x : 200;
      const y = typeof args.y === "number" ? args.y : 200;
      const width = typeof args.width === "number" ? args.width : 120;
      const height = typeof args.height === "number" ? args.height : 72;

      const element = editor.createElementFromTool(tool, { x, y }, { width, height });
      if (element) {
        const id = editor.renderer.getId(element);
        if (typeof args.text === "string")
          editor.documentCommands.updatePresentations({ [id]: { text: args.text } });
        return JSON.stringify({ message: `已创建 ${shapeType} 图形`, id });
      }
      throw new Error(`创建 ${shapeType} 图形失败`);
    },
  },

  // 批量创建图形
  {
    name: "batch_create_shapes",
    category: "shape",
    description: "批量创建多个图形。支持指定每个图形的类型、位置、文本等。网格排列时自动计算位置。",
    parameters: {
      type: "object",
      properties: {
        shape_type: {
          type: "string",
          enum: Object.keys(SHAPE_TOOLS),
          description: "所有图形的类型",
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 20,
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
          type: "integer",
          minimum: 0,
          description: "网格列数。0 表示水平排列（可选，默认 5）",
        },
      },
      required: ["shape_type", "count"],
    },
    execute: (editor, args) => {
      const shapeType = args.shape_type as string;
      const count = args.count as number;
      const texts = Array.isArray(args.texts) ? (args.texts as string[]) : [];
      const startX = typeof args.start_x === "number" ? args.start_x : 100;
      const startY = typeof args.start_y === "number" ? args.start_y : 100;
      const width = typeof args.width === "number" ? args.width : 120;
      const height = typeof args.height === "number" ? args.height : 72;
      const spacingX = typeof args.spacing_x === "number" ? args.spacing_x : 150;
      const spacingY = typeof args.spacing_y === "number" ? args.spacing_y : 100;
      const columns =
        args.columns === 0 ? count : typeof args.columns === "number" ? args.columns : 5;

      const tool = SHAPE_TOOLS[shapeType];
      if (!Object.hasOwn(SHAPE_TOOLS, shapeType)) throw new Error(`不支持的图形类型: ${shapeType}`);

      let created = 0;
      const ids: string[] = [];
      const textPatches: Record<string, { text: string }> = {};
      editor.beginTransaction();

      try {
        for (let i = 0; i < count; i++) {
          const col = i % columns;
          const row = Math.floor(i / columns);
          const x = startX + col * spacingX;
          const y = startY + row * spacingY;
          const text = texts[i];

          const element = editor.createElementFromTool(tool, { x, y }, { width, height });
          if (element) ids.push(editor.renderer.getId(element));
          if (element && text) {
            textPatches[editor.renderer.getId(element)] = { text };
          }
          if (element) created++;
        }

        if (Object.keys(textPatches).length)
          editor.documentCommands.updatePresentations(textPatches);
        return JSON.stringify({
          message: `已批量创建 ${created}/${count} 个 ${shapeType} 图形`,
          ids,
        });
      } finally {
        editor.endTransaction();
      }
    },
  },

  // 模板插入
  {
    name: "insert_template",
    category: "template",
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

      if (!TemplateRegistry.isValidKind(templateType)) {
        throw new Error(`不支持的模板类型: ${templateType}`);
      }

      try {
        editor.beginTransaction();
        const data = templateMap[templateType]();

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

        insertTemplateFlow(editor, transformedGraph, getTemplateStyle, data.settings);
        const scaleStr = scale !== 1 ? ` (缩放 ${Math.round(scale * 100)}%)` : "";
        return `已插入 ${templateType} 模板${scaleStr}`;
      } finally {
        editor.endTransaction();
      }
    },
  },

  // 属性修改
  {
    name: "set_style",
    category: "shape",
    description:
      "按文档 ids 修改元素的样式、位置、尺寸和圆角；省略 ids 时修改当前选区。组合的样式自动应用到形状子元素。",
    parameters: {
      type: "object",
      properties: {
        ids: TARGET_IDS_PARAMETER,
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
      const ids = getTargetIds(editor, args);
      if (ids.length === 0) {
        throw new Error("请先选中要修改的元素");
      }
      const keys = [
        "x",
        "y",
        "width",
        "height",
        "rotation",
        "fill",
        "stroke",
        "stroke_width",
        "opacity",
        "corner_radius",
      ];
      const patch = Object.fromEntries(
        keys.filter((key) => args[key] !== undefined).map((key) => [key, args[key]]),
      );
      if (!Object.keys(patch).length) throw new Error("未提供要修改的属性");
      return editor.commands
        .execute("document.presentation.update", {
          ids,
          patch,
        })
        .then((result) => {
          if (!result.success) throw new Error(result.message);
          return result.message;
        });
    },
  },

  // 文字修改
  {
    name: "modify_text",
    category: "text",
    description:
      "按文档 ids 修改文字内容、字号和颜色；省略 ids 时使用当前选区。自动处理节点和组合内的文字。",
    parameters: {
      type: "object",
      properties: {
        ids: TARGET_IDS_PARAMETER,
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
      const ids = getTargetIds(editor, args);
      if (ids.length === 0) {
        throw new Error("请先选中要修改文字的元素");
      }

      const keys = ["text", "font_size", "text_color"];
      const patch = Object.fromEntries(
        keys.filter((key) => args[key] !== undefined).map((key) => [key, args[key]]),
      );
      if (!Object.keys(patch).length) throw new Error("未提供要修改的文字属性");
      return editor.commands
        .execute("document.presentation.update", {
          ids,
          patch,
        })
        .then((result) => {
          if (!result.success) throw new Error(result.message);
          return result.message;
        });
    },
  },

  // 视图控制
  commandTool("zoom_fit", "适应画布内容", "view", ACTION_NAME.VIEW_FIT),
  commandTool("zoom_in", "放大画布", "view", ACTION_NAME.ZOOM_IN),
  commandTool("zoom_out", "缩小画布", "view", ACTION_NAME.ZOOM_OUT),
  commandTool("zoom_reset", "重置缩放为 100%", "view", ACTION_NAME.ZOOM_RESET),

  // 画布操作
  commandTool("clear_canvas", "清空画布上的所有元素", "canvas", ACTION_NAME.CLEAR_CANVAS),
  {
    name: "get_canvas_info",
    category: "canvas",
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
    category: "canvas",
    description: "获取当前选区的文档节点和连接线信息，不包含内部渲染子元素。最多返回 50 个目标。",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: (editor) => {
      const ids = [
        ...new Set((editor.app.editor.list ?? []).map((element) => editor.renderer.getId(element))),
      ];
      const edges = new Map(editor.document.snapshot().edges.map((edge) => [edge.id, edge]));
      return JSON.stringify({
        elements: ids.slice(0, 50).map((id) => editor.document.getNode(id) ?? edges.get(id)),
        total: ids.length,
        truncated: ids.length > 50,
      });
    },
  },

  // 搜索与连接
  {
    name: "search_elements",
    category: "canvas",
    description:
      "按文字、节点类型、kind 或名称搜索文档逻辑节点，返回可用于修改和连接的稳定文档 ID。最多返回 100 个结果。",
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
      if (!query) throw new Error("请提供搜索关键词");

      const matches: Array<Record<string, unknown>> = [];
      let total = 0;
      const visit = (nodes: DocumentNode[]) => {
        for (const node of nodes) {
          const text = String(
            node.data.text ?? node.children.find((child) => child.type === "Text")?.data.text ?? "",
          );
          const name = String(node.data.name ?? "");
          if (
            [node.type, node.data.kind, name, text].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(query),
            )
          ) {
            total++;
            if (matches.length < 100)
              matches.push({
                id: node.id,
                type: node.type,
                name,
                text: text.slice(0, 100),
                x: node.data.x ?? 0,
                y: node.data.y ?? 0,
                width: node.data.width,
                height: node.data.height,
              });
          }
          visit(node.children);
        }
      };
      visit(editor.document.snapshot().nodes);
      return JSON.stringify({ matches, total, truncated: total > matches.length });
    },
  },
  {
    name: "connect_elements",
    category: "canvas",
    description: "使用搜索或创建返回的文档 ID 连接两个节点。",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "起始节点的文档 ID",
        },
        to: {
          type: "string",
          description: "目标节点的文档 ID",
        },
      },
      required: ["from", "to"],
    },
    execute: (editor, args) => {
      const fromId = String(args.from || "");
      const toId = String(args.to || "");
      if (!editor.document.getNode(fromId)) throw new Error(`起始节点不存在: ${fromId}`);
      if (!editor.document.getNode(toId)) throw new Error(`目标节点不存在: ${toId}`);
      if (fromId === toId) throw new Error("不能连接节点自身");

      const edgeId = crypto.randomUUID();
      editor.documentCommands.insertEdge({
        id: edgeId,
        parentId: null,
        from: { nodeId: fromId, port: { side: "right", percent: 0.5 } },
        to: { nodeId: toId, port: { side: "left", percent: 0.5 } },
        data: { routeType: "orthogonal" },
      });
      const connector = editor.renderer.getNode(edgeId);
      if (connector) editor.app.editor.select(connector);
      return JSON.stringify({ id: edgeId, from: fromId, to: toId });
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
    execute: (_editor, args) => {
      return JSON.stringify(
        AGENT_TOOLS.filter((tool) => !args.category || tool.category === args.category).map(
          ({ name, description, category }) => ({ name, description, category }),
        ),
      );
    },
  },
  {
    name: "get_tool_details",
    description: "获取指定工具的详细信息，包括参数说明和可选值。用于了解如何使用某个工具。",
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
    execute: (_editor, args) => {
      const tool = AGENT_TOOLS.find((item) => item.name === args.tool_name);
      if (!tool) throw new Error(`工具不存在: ${String(args.tool_name)}`);
      const { name, description, category, parameters } = tool;
      return JSON.stringify({ name, description, category, parameters });
    },
  },
];

export function getAgentTools(): readonly AgentTool[] {
  return AGENT_TOOLS;
}
