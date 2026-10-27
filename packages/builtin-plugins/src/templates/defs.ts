import type { FlowGraph, FlowGraphEdge, FlowGraphNode, FlowGraphNodeStyle } from "@leafer-flow/core/core/flow-graph";
import type { FlowNodeKind } from "@leafer-flow/core/core/flow-node-shape";
import type { FlowDocumentSettings } from "@leafer-flow/core";

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

export type TemplateDefinition = {
  message: string;
  graph: FlowGraph;
  settings?: FlowDocumentSettings;
};

export const templateMap: Record<TemplateKind, () => TemplateDefinition> = {
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

export function getTemplateStyle(kind: FlowNodeKind): FlowGraphNodeStyle {
  const base = { strokeWidth: 2 };
  if (kind === "startEnd" || kind === "bpmnStartEvent" || kind === "bpmnEndEvent") {
    return { ...base, fill: "#ecfdf5", stroke: "#059669" };
  }
  if (kind === "decision" || kind === "bpmnExclusiveGateway") {
    return { ...base, fill: "#fffbeb", stroke: "#d97706" };
  }
  if (kind === "database") return { ...base, fill: "#ecfeff", stroke: "#0891b2" };
  if (kind === "document") return { ...base, fill: "#fff7ed", stroke: "#ea580c" };
  if (kind === "swimlane") return { ...base, fill: "#f0f9ff", stroke: "#0284c7" };
  if (kind === "archActor" || kind === "archUseCase") {
    return { ...base, fill: "#f0fdf4", stroke: "#16a34a" };
  }
  if (kind === "archComponent" || kind === "archService" || kind === "archDevice") {
    return { ...base, fill: "#eff6ff", stroke: "#2563eb" };
  }
  if (kind === "archCloud") return { ...base, fill: "#fef3c7", stroke: "#d97706" };
  if (kind === "archCache" || kind === "archQueue") {
    return { ...base, fill: "#f0f9ff", stroke: "#0284c7" };
  }
  return { ...base, fill: "#eff6ff", stroke: "#2563eb" };
}

/** Shared box sizes — keep orthogonal routing anchors predictable. */
const BOX = {
  terminal: { width: 120, height: 56 },
  process: { width: 140, height: 56 },
  decision: { width: 120, height: 100 },
  bpmnEvent: { width: 72, height: 72 },
  bpmnGateway: { width: 88, height: 88 },
  bpmnTask: { width: 140, height: 64 },
  arch: { width: 150, height: 80 },
  database: { width: 130, height: 90 },
} as const;

/** Column x origins for left-to-right business flows. */
const COL = [100, 300, 500, 700, 900, 1100, 1300] as const;
const ROW = 160;

function node(
  id: string,
  text: string,
  kind: FlowNodeKind,
  x: number,
  y: number,
  size: { width: number; height: number },
): FlowGraphNode {
  return { id, text, kind, x, y, width: size.width, height: size.height };
}

/** Vertically center a box on the main row midline. */
function yOnRow(height: number, row = ROW) {
  return row + BOX.process.height / 2 - height / 2;
}

function edge(
  id: string,
  from: string,
  to: string,
  fromSide: FlowGraphEdge["fromSide"],
  toSide: FlowGraphEdge["toSide"],
  label?: string,
): FlowGraphEdge {
  return label ? { id, from, to, fromSide, toSide, label } : { id, from, to, fromSide, toSide };
}

function defineTemplate(message: string, nodes: FlowGraphNode[], edges: FlowGraphEdge[]): TemplateDefinition {
  return { message, graph: { nodes, edges } };
}

function approvalTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入审批流程模板",
    [
      node("approval:start", "提交申请", "startEnd", COL[0], y, BOX.terminal),
      node("approval:review", "主管审批", "process", COL[1], y, BOX.process),
      node("approval:decision", "是否通过", "decision", COL[2], yd, BOX.decision),
      node("approval:pass", "归档", "process", COL[3], y - 50, BOX.process),
      node("approval:reject", "退回修改", "process", COL[3], y + 70, BOX.process),
      node("approval:end", "结束", "startEnd", COL[4], y - 50, BOX.terminal),
    ],
    [
      edge("approval:e1", "approval:start", "approval:review", "right", "left"),
      edge("approval:e2", "approval:review", "approval:decision", "right", "left"),
      edge("approval:e3", "approval:decision", "approval:pass", "right", "left", "是"),
      edge("approval:e4", "approval:decision", "approval:reject", "bottom", "left", "否"),
      edge("approval:e5", "approval:pass", "approval:end", "right", "left"),
    ],
  );
}

function decisionTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入判断分支模板",
    [
      node("decision:start", "开始", "startEnd", COL[0], y, BOX.terminal),
      node("decision:check", "条件判断", "decision", COL[1], yd, BOX.decision),
      node("decision:yes", "执行方案 A", "process", COL[2], y - 50, BOX.process),
      node("decision:no", "执行方案 B", "process", COL[2], y + 70, BOX.process),
      node("decision:end", "结束", "startEnd", COL[3], y, BOX.terminal),
    ],
    [
      edge("decision:e1", "decision:start", "decision:check", "right", "left"),
      edge("decision:e2", "decision:check", "decision:yes", "right", "left", "是"),
      edge("decision:e3", "decision:check", "decision:no", "bottom", "left", "否"),
      edge("decision:e4", "decision:yes", "decision:end", "right", "top"),
      edge("decision:e5", "decision:no", "decision:end", "right", "bottom"),
    ],
  );
}

function workOrderTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入工单流转模板",
    [
      node("workOrder:submit", "提交工单", "startEnd", COL[0], y, BOX.terminal),
      node("workOrder:dispatch", "分派处理人", "process", COL[1], y, BOX.process),
      node("workOrder:handle", "处理问题", "process", COL[2], y, BOX.process),
      node("workOrder:resolved", "是否解决", "decision", COL[3], yd, BOX.decision),
      node("workOrder:confirm", "客户确认", "process", COL[4], y - 50, BOX.process),
      node("workOrder:rework", "重新处理", "process", COL[4], y + 70, BOX.process),
      node("workOrder:close", "关闭工单", "startEnd", COL[5], y - 50, BOX.terminal),
    ],
    [
      edge("workOrder:e1", "workOrder:submit", "workOrder:dispatch", "right", "left"),
      edge("workOrder:e2", "workOrder:dispatch", "workOrder:handle", "right", "left"),
      edge("workOrder:e3", "workOrder:handle", "workOrder:resolved", "right", "left"),
      edge("workOrder:e4", "workOrder:resolved", "workOrder:confirm", "right", "left", "是"),
      edge("workOrder:e5", "workOrder:resolved", "workOrder:rework", "bottom", "left", "否"),
      edge("workOrder:e6", "workOrder:confirm", "workOrder:close", "right", "left"),
      edge("workOrder:e7", "workOrder:rework", "workOrder:handle", "left", "bottom"),
    ],
  );
}

function crmTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入 CRM 跟进模板",
    [
      node("crm:lead", "新线索", "startEnd", COL[0], y, BOX.terminal),
      node("crm:contact", "初步沟通", "process", COL[1], y, BOX.process),
      node("crm:intent", "是否有意向", "decision", COL[2], yd, BOX.decision),
      node("crm:opportunity", "建立商机", "process", COL[3], y - 50, BOX.process),
      node("crm:quote", "跟进报价", "process", COL[4], y - 50, BOX.process),
      node("crm:won", "成交", "startEnd", COL[5], y - 50, BOX.terminal),
      node("crm:lost", "标记流失", "startEnd", COL[3], y + 70, BOX.terminal),
    ],
    [
      edge("crm:e1", "crm:lead", "crm:contact", "right", "left"),
      edge("crm:e2", "crm:contact", "crm:intent", "right", "left"),
      edge("crm:e3", "crm:intent", "crm:opportunity", "right", "left", "是"),
      edge("crm:e4", "crm:intent", "crm:lost", "bottom", "left", "否"),
      edge("crm:e5", "crm:opportunity", "crm:quote", "right", "left"),
      edge("crm:e6", "crm:quote", "crm:won", "right", "left"),
    ],
  );
}

function loginTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入登录注册流程模板",
    [
      node("login:open", "打开登录页", "startEnd", COL[0], y, BOX.terminal),
      node("login:input", "输入账号密码", "process", COL[1], y, BOX.process),
      node("login:valid", "校验通过", "decision", COL[2], yd, BOX.decision),
      node("login:home", "进入首页", "startEnd", COL[3], y - 50, BOX.terminal),
      node("login:error", "提示错误", "process", COL[3], y + 70, BOX.process),
    ],
    [
      edge("login:e1", "login:open", "login:input", "right", "left"),
      edge("login:e2", "login:input", "login:valid", "right", "left"),
      edge("login:e3", "login:valid", "login:home", "right", "left", "是"),
      edge("login:e4", "login:valid", "login:error", "bottom", "left", "否"),
      edge("login:e5", "login:error", "login:input", "left", "bottom"),
    ],
  );
}

function paymentTemplate(): TemplateDefinition {
  const y = yOnRow(BOX.process.height);
  const yd = yOnRow(BOX.decision.height);
  return defineTemplate(
    "已插入支付流程模板",
    [
      node("payment:order", "创建订单", "startEnd", COL[0], y, BOX.terminal),
      node("payment:pay", "发起支付", "process", COL[1], y, BOX.process),
      node("payment:gateway", "支付网关", "process", COL[2], y, BOX.process),
      node("payment:result", "支付成功", "decision", COL[3], yd, BOX.decision),
      node("payment:fulfill", "履约发货", "process", COL[4], y - 50, BOX.process),
      node("payment:cancel", "取消订单", "process", COL[4], y + 70, BOX.process),
      node("payment:end", "结束", "startEnd", COL[5], y - 50, BOX.terminal),
    ],
    [
      edge("payment:e1", "payment:order", "payment:pay", "right", "left"),
      edge("payment:e2", "payment:pay", "payment:gateway", "right", "left"),
      edge("payment:e3", "payment:gateway", "payment:result", "right", "left"),
      edge("payment:e4", "payment:result", "payment:fulfill", "right", "left", "是"),
      edge("payment:e5", "payment:result", "payment:cancel", "bottom", "left", "否"),
      edge("payment:e6", "payment:fulfill", "payment:end", "right", "left"),
    ],
  );
}

function bpmnOrderTemplate(): TemplateDefinition {
  const yTask = yOnRow(BOX.bpmnTask.height);
  const yEvent = yOnRow(BOX.bpmnEvent.height);
  const yGate = yOnRow(BOX.bpmnGateway.height);
  const definition = defineTemplate(
    "已插入 BPMN 订单流程模板",
    [
      node("bpmnOrder:start", "开始", "bpmnStartEvent", COL[0], yEvent, BOX.bpmnEvent),
      node("bpmnOrder:create", "创建订单", "bpmnTask", COL[1], yTask, BOX.bpmnTask),
      node("bpmnOrder:gateway", "库存充足", "bpmnExclusiveGateway", COL[2], yGate, BOX.bpmnGateway),
      node("bpmnOrder:reserve", "预留库存", "bpmnTask", COL[3], yTask - 50, BOX.bpmnTask),
      node("bpmnOrder:wait", "等待补货", "bpmnTask", COL[3], yTask + 80, BOX.bpmnTask),
      node("bpmnOrder:end", "结束", "bpmnEndEvent", COL[4], yEvent - 50, BOX.bpmnEvent),
    ],
    [
      edge("bpmnOrder:e1", "bpmnOrder:start", "bpmnOrder:create", "right", "left"),
      edge("bpmnOrder:e2", "bpmnOrder:create", "bpmnOrder:gateway", "right", "left"),
      edge("bpmnOrder:e3", "bpmnOrder:gateway", "bpmnOrder:reserve", "right", "left", "是"),
      edge("bpmnOrder:e4", "bpmnOrder:gateway", "bpmnOrder:wait", "bottom", "left", "否"),
      edge("bpmnOrder:e5", "bpmnOrder:wait", "bpmnOrder:reserve", "top", "bottom"),
      edge("bpmnOrder:e6", "bpmnOrder:reserve", "bpmnOrder:end", "right", "left"),
    ],
  );

  definition.settings = {
    connectorRouteType: "bezier",
  };

  return definition;
}

function systemArchitectureTemplate(): TemplateDefinition {
  const yMid = 180;
  const yTop = 100;
  const yBot = 260;
  return defineTemplate(
    "已插入系统架构图模板",
    [
      node("arch:client", "Web / App", "archActor", COL[0], yMid, BOX.arch),
      node("arch:gateway", "API Gateway", "archComponent", COL[1], yMid, BOX.arch),
      node("arch:service", "业务服务", "archService", COL[2], yTop, BOX.arch),
      node("arch:worker", "异步任务", "archService", COL[2], yBot, BOX.arch),
      node("arch:db", "数据库", "database", COL[3], yTop, BOX.database),
      node("arch:cache", "缓存", "archCache", COL[3], yBot, BOX.database),
      node("arch:cloud", "第三方服务", "archCloud", COL[4], yMid, BOX.arch),
    ],
    [
      edge("arch:e1", "arch:client", "arch:gateway", "right", "left"),
      edge("arch:e2", "arch:gateway", "arch:service", "right", "left"),
      edge("arch:e3", "arch:gateway", "arch:worker", "bottom", "left"),
      edge("arch:e4", "arch:service", "arch:db", "right", "left"),
      edge("arch:e5", "arch:service", "arch:cache", "bottom", "top"),
      edge("arch:e6", "arch:service", "arch:cloud", "right", "left"),
      edge("arch:e7", "arch:worker", "arch:cache", "right", "left"),
    ],
  );
}

function swimlaneCollaborationTemplate(): TemplateDefinition {
  const laneX = 80;
  const laneW = 980;
  const laneH = 120;
  const lane1Y = 80;
  const lane2Y = 220;
  const lane3Y = 360;
  const boxY = (laneY: number) => laneY + (laneH - BOX.process.height) / 2;

  return defineTemplate(
    "已插入泳道协作流程模板",
    [
      // Lanes first so process nodes paint above them.
      node("swim:lane1", "申请人", "swimlane", laneX, lane1Y, { width: laneW, height: laneH }),
      node("swim:lane2", "审批人", "swimlane", laneX, lane2Y, { width: laneW, height: laneH }),
      node("swim:lane3", "系统", "swimlane", laneX, lane3Y, { width: laneW, height: laneH }),
      node("swim:submit", "提交申请", "process", 180, boxY(lane1Y), BOX.process),
      node("swim:review", "审批", "process", 420, boxY(lane2Y), BOX.process),
      node("swim:notify", "发送通知", "process", 660, boxY(lane3Y), BOX.process),
      node("swim:archive", "归档", "startEnd", 900, boxY(lane3Y), BOX.terminal),
    ],
    [
      // Cross-lane links use vertical sides for cleaner orthogonal routes.
      edge("swim:e1", "swim:submit", "swim:review", "bottom", "top"),
      edge("swim:e2", "swim:review", "swim:notify", "bottom", "top"),
      edge("swim:e3", "swim:notify", "swim:archive", "right", "left"),
    ],
  );
}
