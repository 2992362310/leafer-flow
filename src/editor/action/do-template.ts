import { Group, Text, type IUI } from "leafer";
import { Connector } from "@/editor/core/connector";
import type { ConnectorSide, ConnectorState } from "@/editor/core/connector";
import type Editor from "../editor";
import { createConnectorLabel } from "../core/connector-labels";
import { makeGroupSelectionAtomic } from "../core/group-selection";
import { createFlowNodeShape, updateFlowNodeShape } from "../core/flow-node-shape";
import type { FlowNodeKind } from "../core/flow-node-shape";

export type TemplateKind =
  | "approval"
  | "decision"
  | "workOrder"
  | "crm"
  | "login"
  | "payment"
  | "bpmnOrder"
  | "systemArchitecture"
  | "swimlaneCollaboration";

type TemplateNode = {
  id: string;
  text: string;
  type: FlowNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TemplateEdge = {
  from: string;
  to: string;
  label?: string;
  fromSide?: ConnectorSide;
  toSide?: ConnectorSide;
};

type TemplateData = {
  message: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
};

const templateMap: Record<TemplateKind, () => TemplateData> = {
  approval: approvalTemplate,
  decision: decisionTemplate,
  workOrder: workOrderTemplate,
  crm: crmTemplate,
  login: loginTemplate,
  payment: paymentTemplate,
  bpmnOrder: bpmnOrderTemplate,
  systemArchitecture: systemArchitectureTemplate,
  swimlaneCollaboration: swimlaneCollaborationTemplate,
};

export function doInsertTemplate(
  editor: Editor,
  kind: TemplateKind,
): { success: boolean; message: string } {
  // 用事务包裹整个模板插入，使其可一步撤销
  editor.beginTransaction();

  const data = templateMap[kind]();
  const nodes = new Map<string, IUI>();

  data.nodes.forEach((node) => {
    const element = createFlowNode(node);
    editor.app.tree.add(element);
    nodes.set(node.id, element);
  });

  data.edges.forEach((edge) => {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) return;

    const connector = new Connector(editor.app, {
      from,
      to,
      stroke: "#278bfe",
      strokeWidth: 2,
      cornerRadius: 10,
      endArrow: "arrow",
      updateMode: "event",
      getNodeId: (node: IUI) => String(node.innerId),
    });
    applyTemplateEdgeAnchors(connector, edge, nodes);
    editor.app.tree.add(connector);

    if (edge.label) {
      const label = createConnectorLabel(connector);
      label.text = edge.label;
      editor.app.tree.add(label);
    }
  });

  editor.endTransaction();
  return { success: true, message: data.message };
}

function createFlowNode(node: TemplateNode) {
  const shape = createFlowNodeShape(node.type, getTemplateStyle(node.type));
  updateFlowNodeShape(shape, node.type, node.width, node.height);
  const text = new Text({
    draggable: false,
    editable: true,
    x: 12,
    y: 10,
    width: Math.max(node.width - 24, 0),
    height: Math.max(node.height - 20, 0),
    text: node.text,
    fill: "#1f2937",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    verticalAlign: "middle",
  });

  const group = new Group({
    x: node.x,
    y: node.y,
    editable: true,
    name: node.text,
    children: [shape, text],
  });
  makeGroupSelectionAtomic(group);
  return group;
}

function getTemplateStyle(kind: FlowNodeKind) {
  const base = { strokeWidth: 2, opacity: 1 };
  if (kind === "startEnd" || kind === "bpmnStartEvent" || kind === "bpmnEndEvent")
    return { ...base, fill: "#ecfdf5", stroke: "#059669" };
  if (kind === "decision" || kind === "bpmnExclusiveGateway")
    return { ...base, fill: "#fffbeb", stroke: "#d97706" };
  if (kind === "database")
    return { ...base, fill: "#ecfeff", stroke: "#0891b2" };
  if (kind === "document")
    return { ...base, fill: "#fff7ed", stroke: "#ea580c" };
  if (kind === "swimlane")
    return { ...base, fill: "#f0f9ff", stroke: "#0284c7" };
  return { ...base, fill: "#eff6ff", stroke: "#2563eb" };
}

function applyTemplateEdgeAnchors(
  connector: Connector,
  edge: TemplateEdge,
  nodes: Map<string, IUI>,
) {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) return;

  const state = connector.getState() as ConnectorState;
  const nextState = {
    ...state,
    opt1: {
      ...(state.opt1 || {}),
      side: edge.fromSide ?? inferSide(from, to),
      percent: 0.5,
    },
    opt2: {
      ...(state.opt2 || {}),
      side: edge.toSide ?? inferSide(to, from),
      percent: 0.5,
    },
  } as ConnectorState;

  connector.setState(nextState, (id: string | number) => resolveTemplateNodeById(nodes, id));
}

function resolveTemplateNodeById(nodes: Map<string, IUI>, id: string | number) {
  for (const node of nodes.values()) {
    if (String(node.innerId) === String(id)) return node;
  }
  return undefined;
}

function inferSide(from: IUI, to: IUI): ConnectorSide {
  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function getNodeCenter(node: IUI) {
  const bounds = node.getBounds("box", "page");
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function approvalTemplate(): TemplateData {
  return {
    message: "已插入审批流程模板",
    nodes: [
      { id: "start", text: "提交申请", type: "startEnd", x: 120, y: 120, width: 120, height: 56 },
      { id: "review", text: "主管审批", type: "process", x: 320, y: 120, width: 120, height: 56 },
      {
        id: "decision",
        text: "是否通过",
        type: "decision",
        x: 520,
        y: 100,
        width: 130,
        height: 96,
      },
      { id: "pass", text: "归档", type: "process", x: 740, y: 80, width: 120, height: 56 },
      { id: "reject", text: "退回修改", type: "process", x: 740, y: 190, width: 120, height: 56 },
      { id: "end", text: "结束", type: "startEnd", x: 940, y: 80, width: 120, height: 56 },
    ],
    edges: [
      { from: "start", to: "review" },
      { from: "review", to: "decision" },
      { from: "decision", to: "pass", label: "是", fromSide: "right", toSide: "left" },
      { from: "decision", to: "reject", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "pass", to: "end" },
    ],
  };
}

function decisionTemplate(): TemplateData {
  return {
    message: "已插入判断分支模板",
    nodes: [
      { id: "start", text: "开始", type: "startEnd", x: 160, y: 140, width: 110, height: 54 },
      { id: "check", text: "条件判断", type: "decision", x: 360, y: 118, width: 130, height: 96 },
      { id: "yes", text: "执行方案 A", type: "process", x: 600, y: 80, width: 150, height: 56 },
      { id: "no", text: "执行方案 B", type: "process", x: 600, y: 200, width: 150, height: 56 },
      { id: "end", text: "结束", type: "startEnd", x: 840, y: 140, width: 110, height: 54 },
    ],
    edges: [
      { from: "start", to: "check" },
      { from: "check", to: "yes", label: "是", fromSide: "right", toSide: "left" },
      { from: "check", to: "no", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "yes", to: "end", fromSide: "right", toSide: "top" },
      { from: "no", to: "end", fromSide: "right", toSide: "bottom" },
    ],
  };
}

function workOrderTemplate(): TemplateData {
  return {
    message: "已插入工单流转模板",
    nodes: [
      { id: "submit", text: "提交工单", type: "startEnd", x: 100, y: 150, width: 120, height: 56 },
      {
        id: "dispatch",
        text: "分派处理人",
        type: "process",
        x: 300,
        y: 150,
        width: 130,
        height: 56,
      },
      { id: "handle", text: "处理问题", type: "process", x: 520, y: 150, width: 120, height: 56 },
      {
        id: "resolved",
        text: "是否解决",
        type: "decision",
        x: 720,
        y: 128,
        width: 130,
        height: 96,
      },
      { id: "confirm", text: "客户确认", type: "process", x: 940, y: 90, width: 120, height: 56 },
      { id: "rework", text: "重新处理", type: "process", x: 940, y: 220, width: 120, height: 56 },
      { id: "close", text: "关闭工单", type: "startEnd", x: 1140, y: 90, width: 120, height: 56 },
    ],
    edges: [
      { from: "submit", to: "dispatch" },
      { from: "dispatch", to: "handle" },
      { from: "handle", to: "resolved" },
      { from: "resolved", to: "confirm", label: "是", fromSide: "right", toSide: "left" },
      { from: "resolved", to: "rework", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "confirm", to: "close" },
      { from: "rework", to: "handle", fromSide: "left", toSide: "bottom" },
    ],
  };
}

function crmTemplate(): TemplateData {
  return {
    message: "已插入 CRM 跟进模板",
    nodes: [
      { id: "lead", text: "新线索", type: "startEnd", x: 120, y: 150, width: 110, height: 54 },
      { id: "contact", text: "初步沟通", type: "process", x: 320, y: 150, width: 120, height: 56 },
      {
        id: "intent",
        text: "是否有意向",
        type: "decision",
        x: 520,
        y: 128,
        width: 130,
        height: 96,
      },
      {
        id: "opportunity",
        text: "建立商机",
        type: "process",
        x: 740,
        y: 90,
        width: 120,
        height: 56,
      },
      { id: "quote", text: "跟进报价", type: "process", x: 940, y: 90, width: 120, height: 56 },
      { id: "won", text: "成交", type: "startEnd", x: 1140, y: 70, width: 110, height: 54 },
      { id: "lost", text: "标记流失", type: "startEnd", x: 740, y: 220, width: 120, height: 56 },
    ],
    edges: [
      { from: "lead", to: "contact" },
      { from: "contact", to: "intent" },
      { from: "intent", to: "opportunity", label: "是", fromSide: "right", toSide: "left" },
      { from: "intent", to: "lost", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "opportunity", to: "quote" },
      { from: "quote", to: "won" },
    ],
  };
}

function loginTemplate(): TemplateData {
  return {
    message: "已插入登录注册流程模板",
    nodes: [
      { id: "open", text: "打开登录页", type: "startEnd", x: 120, y: 120, width: 128, height: 56 },
      {
        id: "input",
        text: "输入账号密码",
        type: "process",
        x: 330,
        y: 120,
        width: 140,
        height: 56,
      },
      { id: "valid", text: "校验通过", type: "decision", x: 560, y: 100, width: 130, height: 96 },
      { id: "home", text: "进入首页", type: "startEnd", x: 790, y: 80, width: 120, height: 56 },
      { id: "error", text: "提示错误", type: "process", x: 790, y: 210, width: 120, height: 56 },
    ],
    edges: [
      { from: "open", to: "input" },
      { from: "input", to: "valid" },
      { from: "valid", to: "home", label: "是", fromSide: "right", toSide: "left" },
      { from: "valid", to: "error", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "error", to: "input", fromSide: "left", toSide: "bottom" },
    ],
  };
}

function paymentTemplate(): TemplateData {
  return {
    message: "已插入支付流程模板",
    nodes: [
      { id: "order", text: "创建订单", type: "startEnd", x: 120, y: 130, width: 120, height: 56 },
      { id: "pay", text: "发起支付", type: "process", x: 320, y: 130, width: 120, height: 56 },
      { id: "gateway", text: "支付网关", type: "process", x: 520, y: 130, width: 120, height: 56 },
      { id: "result", text: "支付成功", type: "decision", x: 720, y: 108, width: 130, height: 96 },
      { id: "fulfill", text: "履约发货", type: "process", x: 940, y: 80, width: 120, height: 56 },
      { id: "cancel", text: "取消订单", type: "process", x: 940, y: 210, width: 120, height: 56 },
      { id: "end", text: "结束", type: "startEnd", x: 1140, y: 80, width: 110, height: 54 },
    ],
    edges: [
      { from: "order", to: "pay" },
      { from: "pay", to: "gateway" },
      { from: "gateway", to: "result" },
      { from: "result", to: "fulfill", label: "是", fromSide: "right", toSide: "left" },
      { from: "result", to: "cancel", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "fulfill", to: "end" },
    ],
  };
}

function bpmnOrderTemplate(): TemplateData {
  return {
    message: "已插入 BPMN 订单流程模板",
    nodes: [
      { id: "start", text: "开始", type: "bpmnStartEvent", x: 120, y: 140, width: 72, height: 72 },
      { id: "create", text: "创建订单", type: "process", x: 280, y: 140, width: 130, height: 64 },
      {
        id: "gateway",
        text: "库存充足",
        type: "bpmnExclusiveGateway",
        x: 500,
        y: 128,
        width: 90,
        height: 90,
      },
      { id: "reserve", text: "预留库存", type: "process", x: 700, y: 90, width: 130, height: 64 },
      { id: "wait", text: "等待补货", type: "process", x: 700, y: 220, width: 130, height: 64 },
      { id: "end", text: "结束", type: "bpmnStartEvent", x: 920, y: 90, width: 72, height: 72 },
    ],
    edges: [
      { from: "start", to: "create" },
      { from: "create", to: "gateway" },
      { from: "gateway", to: "reserve", label: "是", fromSide: "right", toSide: "left" },
      { from: "gateway", to: "wait", label: "否", fromSide: "bottom", toSide: "left" },
      { from: "wait", to: "reserve", fromSide: "top", toSide: "bottom" },
      { from: "reserve", to: "end" },
    ],
  };
}

function systemArchitectureTemplate(): TemplateData {
  return {
    message: "已插入系统架构图模板",
    nodes: [
      { id: "client", text: "Web / App", type: "process", x: 120, y: 160, width: 140, height: 70 },
      {
        id: "gateway",
        text: "API Gateway",
        type: "archComponent",
        x: 360,
        y: 160,
        width: 150,
        height: 80,
      },
      {
        id: "service",
        text: "业务服务",
        type: "archComponent",
        x: 600,
        y: 100,
        width: 150,
        height: 80,
      },
      { id: "worker", text: "异步任务", type: "archComponent", x: 600, y: 240, width: 150, height: 80 },
      { id: "db", text: "数据库", type: "database", x: 860, y: 100, width: 130, height: 90 },
      { id: "cache", text: "缓存", type: "database", x: 860, y: 250, width: 130, height: 90 },
      { id: "cloud", text: "第三方服务", type: "archCloud", x: 1080, y: 160, width: 150, height: 90 },
    ],
    edges: [
      { from: "client", to: "gateway" },
      { from: "gateway", to: "service", fromSide: "right", toSide: "left" },
      { from: "gateway", to: "worker", fromSide: "bottom", toSide: "left" },
      { from: "service", to: "db", fromSide: "right", toSide: "left" },
      { from: "service", to: "cache", fromSide: "bottom", toSide: "left" },
      { from: "service", to: "cloud", fromSide: "right", toSide: "left" },
    ],
  };
}

function swimlaneCollaborationTemplate(): TemplateData {
  return {
    message: "已插入泳道协作流程模板",
    nodes: [
      { id: "lane1", text: "申请人", type: "swimlane", x: 80, y: 80, width: 980, height: 110 },
      { id: "lane2", text: "审批人", type: "swimlane", x: 80, y: 210, width: 980, height: 110 },
      { id: "lane3", text: "系统", type: "swimlane", x: 80, y: 340, width: 980, height: 110 },
      { id: "submit", text: "提交申请", type: "process", x: 170, y: 115, width: 120, height: 54 },
      { id: "review", text: "审批", type: "process", x: 390, y: 245, width: 120, height: 54 },
      { id: "notify", text: "发送通知", type: "process", x: 610, y: 375, width: 120, height: 54 },
      { id: "archive", text: "归档", type: "startEnd", x: 830, y: 375, width: 120, height: 54 },
    ],
    edges: [
      { from: "submit", to: "review" },
      { from: "review", to: "notify" },
      { from: "notify", to: "archive" },
    ],
  };
}
