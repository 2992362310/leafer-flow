import { Text, type IUI } from "leafer";
import type { App } from "leafer";
import { Connector } from "../../../core/connector";
import { createConnector } from "../../../core/flow-serialization";
import type Editor from "../../../editor";
import { ACTION_NAME, TOOL_NAME } from "../../../constants";

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
