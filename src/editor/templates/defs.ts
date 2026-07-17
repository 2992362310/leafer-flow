import type { FlowNodeKind } from "../core/flow-node-shape";
import type { TemplateFlowEdge, TemplateFlowNode } from "./build";

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
  nodes: TemplateFlowNode[];
  edges: TemplateFlowEdge[];
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

export function getTemplateStyle(kind: FlowNodeKind) {
  const base = { strokeWidth: 2 };
  if (kind === "startEnd" || kind === "bpmnStartEvent" || kind === "bpmnEndEvent")
    return { ...base, fill: "#ecfdf5", stroke: "#059669" };
  if (kind === "decision" || kind === "bpmnExclusiveGateway")
    return { ...base, fill: "#fffbeb", stroke: "#d97706" };
  if (kind === "database") return { ...base, fill: "#ecfeff", stroke: "#0891b2" };
  if (kind === "document") return { ...base, fill: "#fff7ed", stroke: "#ea580c" };
  if (kind === "swimlane") return { ...base, fill: "#f0f9ff", stroke: "#0284c7" };
  if (kind === "archActor" || kind === "archUseCase")
    return { ...base, fill: "#f0fdf4", stroke: "#16a34a" };
  if (kind === "archComponent" || kind === "archService" || kind === "archDevice")
    return { ...base, fill: "#eff6ff", stroke: "#2563eb" };
  if (kind === "archCloud") return { ...base, fill: "#fef3c7", stroke: "#d97706" };
  if (kind === "archCache" || kind === "archQueue")
    return { ...base, fill: "#f0f9ff", stroke: "#0284c7" };
  return { ...base, fill: "#eff6ff", stroke: "#2563eb" };
}

function defineTemplate(
  message: string,
  nodes: TemplateFlowNode[],
  edges: TemplateFlowEdge[],
): TemplateDefinition {
  return { message, nodes, edges };
}

function approvalTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入审批流程模板",
    [
      { id: "approval:start", text: "提交申请", type: "startEnd", x: 120, y: 120, width: 120, height: 56 },
      { id: "approval:review", text: "主管审批", type: "process", x: 320, y: 120, width: 120, height: 56 },
      { id: "approval:decision", text: "是否通过", type: "decision", x: 520, y: 100, width: 130, height: 96 },
      { id: "approval:pass", text: "归档", type: "process", x: 740, y: 80, width: 120, height: 56 },
      { id: "approval:reject", text: "退回修改", type: "process", x: 740, y: 190, width: 120, height: 56 },
      { id: "approval:end", text: "结束", type: "startEnd", x: 940, y: 80, width: 120, height: 56 },
    ],
    [
      { id: "approval:e1", from: "approval:start", to: "approval:review", fromSide: "right", toSide: "left" },
      { id: "approval:e2", from: "approval:review", to: "approval:decision", fromSide: "right", toSide: "left" },
      {
        id: "approval:e3",
        from: "approval:decision",
        to: "approval:pass",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "approval:e4",
        from: "approval:decision",
        to: "approval:reject",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      { id: "approval:e5", from: "approval:pass", to: "approval:end", fromSide: "right", toSide: "left" },
    ],
  );
}

function decisionTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入判断分支模板",
    [
      { id: "decision:start", text: "开始", type: "startEnd", x: 160, y: 140, width: 110, height: 54 },
      { id: "decision:check", text: "条件判断", type: "decision", x: 360, y: 118, width: 130, height: 96 },
      { id: "decision:yes", text: "执行方案 A", type: "process", x: 600, y: 80, width: 150, height: 56 },
      { id: "decision:no", text: "执行方案 B", type: "process", x: 600, y: 200, width: 150, height: 56 },
      { id: "decision:end", text: "结束", type: "startEnd", x: 840, y: 140, width: 110, height: 54 },
    ],
    [
      { id: "decision:e1", from: "decision:start", to: "decision:check", fromSide: "right", toSide: "left" },
      {
        id: "decision:e2",
        from: "decision:check",
        to: "decision:yes",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "decision:e3",
        from: "decision:check",
        to: "decision:no",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      { id: "decision:e4", from: "decision:yes", to: "decision:end", fromSide: "right", toSide: "top" },
      { id: "decision:e5", from: "decision:no", to: "decision:end", fromSide: "right", toSide: "bottom" },
    ],
  );
}

function workOrderTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入工单流转模板",
    [
      { id: "workOrder:submit", text: "提交工单", type: "startEnd", x: 100, y: 150, width: 120, height: 56 },
      {
        id: "workOrder:dispatch",
        text: "分派处理人",
        type: "process",
        x: 300,
        y: 150,
        width: 130,
        height: 56,
      },
      { id: "workOrder:handle", text: "处理问题", type: "process", x: 520, y: 150, width: 120, height: 56 },
      {
        id: "workOrder:resolved",
        text: "是否解决",
        type: "decision",
        x: 720,
        y: 128,
        width: 130,
        height: 96,
      },
      { id: "workOrder:confirm", text: "客户确认", type: "process", x: 940, y: 90, width: 120, height: 56 },
      { id: "workOrder:rework", text: "重新处理", type: "process", x: 940, y: 220, width: 120, height: 56 },
      { id: "workOrder:close", text: "关闭工单", type: "startEnd", x: 1140, y: 90, width: 120, height: 56 },
    ],
    [
      {
        id: "workOrder:e1",
        from: "workOrder:submit",
        to: "workOrder:dispatch",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "workOrder:e2",
        from: "workOrder:dispatch",
        to: "workOrder:handle",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "workOrder:e3",
        from: "workOrder:handle",
        to: "workOrder:resolved",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "workOrder:e4",
        from: "workOrder:resolved",
        to: "workOrder:confirm",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "workOrder:e5",
        from: "workOrder:resolved",
        to: "workOrder:rework",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      {
        id: "workOrder:e6",
        from: "workOrder:confirm",
        to: "workOrder:close",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "workOrder:e7",
        from: "workOrder:rework",
        to: "workOrder:handle",
        fromSide: "left",
        toSide: "bottom",
      },
    ],
  );
}

function crmTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入 CRM 跟进模板",
    [
      { id: "crm:lead", text: "新线索", type: "startEnd", x: 120, y: 150, width: 110, height: 54 },
      { id: "crm:contact", text: "初步沟通", type: "process", x: 320, y: 150, width: 120, height: 56 },
      { id: "crm:intent", text: "是否有意向", type: "decision", x: 520, y: 128, width: 130, height: 96 },
      { id: "crm:opportunity", text: "建立商机", type: "process", x: 740, y: 90, width: 120, height: 56 },
      { id: "crm:quote", text: "跟进报价", type: "process", x: 940, y: 90, width: 120, height: 56 },
      { id: "crm:won", text: "成交", type: "startEnd", x: 1140, y: 70, width: 110, height: 54 },
      { id: "crm:lost", text: "标记流失", type: "startEnd", x: 740, y: 220, width: 120, height: 56 },
    ],
    [
      { id: "crm:e1", from: "crm:lead", to: "crm:contact", fromSide: "right", toSide: "left" },
      { id: "crm:e2", from: "crm:contact", to: "crm:intent", fromSide: "right", toSide: "left" },
      {
        id: "crm:e3",
        from: "crm:intent",
        to: "crm:opportunity",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "crm:e4",
        from: "crm:intent",
        to: "crm:lost",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      { id: "crm:e5", from: "crm:opportunity", to: "crm:quote", fromSide: "right", toSide: "left" },
      { id: "crm:e6", from: "crm:quote", to: "crm:won", fromSide: "right", toSide: "left" },
    ],
  );
}

function loginTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入登录注册流程模板",
    [
      { id: "login:open", text: "打开登录页", type: "startEnd", x: 120, y: 120, width: 128, height: 56 },
      { id: "login:input", text: "输入账号密码", type: "process", x: 330, y: 120, width: 140, height: 56 },
      { id: "login:valid", text: "校验通过", type: "decision", x: 560, y: 100, width: 130, height: 96 },
      { id: "login:home", text: "进入首页", type: "startEnd", x: 790, y: 80, width: 120, height: 56 },
      { id: "login:error", text: "提示错误", type: "process", x: 790, y: 210, width: 120, height: 56 },
    ],
    [
      { id: "login:e1", from: "login:open", to: "login:input", fromSide: "right", toSide: "left" },
      { id: "login:e2", from: "login:input", to: "login:valid", fromSide: "right", toSide: "left" },
      {
        id: "login:e3",
        from: "login:valid",
        to: "login:home",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "login:e4",
        from: "login:valid",
        to: "login:error",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      { id: "login:e5", from: "login:error", to: "login:input", fromSide: "left", toSide: "bottom" },
    ],
  );
}

function paymentTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入支付流程模板",
    [
      { id: "payment:order", text: "创建订单", type: "startEnd", x: 120, y: 130, width: 120, height: 56 },
      { id: "payment:pay", text: "发起支付", type: "process", x: 320, y: 130, width: 120, height: 56 },
      { id: "payment:gateway", text: "支付网关", type: "process", x: 520, y: 130, width: 120, height: 56 },
      { id: "payment:result", text: "支付成功", type: "decision", x: 720, y: 108, width: 130, height: 96 },
      { id: "payment:fulfill", text: "履约发货", type: "process", x: 940, y: 80, width: 120, height: 56 },
      { id: "payment:cancel", text: "取消订单", type: "process", x: 940, y: 210, width: 120, height: 56 },
      { id: "payment:end", text: "结束", type: "startEnd", x: 1140, y: 80, width: 110, height: 54 },
    ],
    [
      { id: "payment:e1", from: "payment:order", to: "payment:pay", fromSide: "right", toSide: "left" },
      {
        id: "payment:e2",
        from: "payment:pay",
        to: "payment:gateway",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "payment:e3",
        from: "payment:gateway",
        to: "payment:result",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "payment:e4",
        from: "payment:result",
        to: "payment:fulfill",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "payment:e5",
        from: "payment:result",
        to: "payment:cancel",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      {
        id: "payment:e6",
        from: "payment:fulfill",
        to: "payment:end",
        fromSide: "right",
        toSide: "left",
      },
    ],
  );
}

function bpmnOrderTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入 BPMN 订单流程模板",
    [
      {
        id: "bpmnOrder:start",
        text: "开始",
        type: "bpmnStartEvent",
        x: 120,
        y: 140,
        width: 72,
        height: 72,
      },
      { id: "bpmnOrder:create", text: "创建订单", type: "process", x: 280, y: 140, width: 130, height: 64 },
      {
        id: "bpmnOrder:gateway",
        text: "库存充足",
        type: "bpmnExclusiveGateway",
        x: 500,
        y: 128,
        width: 90,
        height: 90,
      },
      {
        id: "bpmnOrder:reserve",
        text: "预留库存",
        type: "process",
        x: 700,
        y: 90,
        width: 130,
        height: 64,
      },
      { id: "bpmnOrder:wait", text: "等待补货", type: "process", x: 700, y: 220, width: 130, height: 64 },
      { id: "bpmnOrder:end", text: "结束", type: "bpmnEndEvent", x: 920, y: 90, width: 72, height: 72 },
    ],
    [
      {
        id: "bpmnOrder:e1",
        from: "bpmnOrder:start",
        to: "bpmnOrder:create",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "bpmnOrder:e2",
        from: "bpmnOrder:create",
        to: "bpmnOrder:gateway",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "bpmnOrder:e3",
        from: "bpmnOrder:gateway",
        to: "bpmnOrder:reserve",
        label: "是",
        fromSide: "right",
        toSide: "left",
      },
      {
        id: "bpmnOrder:e4",
        from: "bpmnOrder:gateway",
        to: "bpmnOrder:wait",
        label: "否",
        fromSide: "bottom",
        toSide: "left",
      },
      {
        id: "bpmnOrder:e5",
        from: "bpmnOrder:wait",
        to: "bpmnOrder:reserve",
        fromSide: "top",
        toSide: "bottom",
      },
      {
        id: "bpmnOrder:e6",
        from: "bpmnOrder:reserve",
        to: "bpmnOrder:end",
        fromSide: "right",
        toSide: "left",
      },
    ],
  );
}

function systemArchitectureTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入系统架构图模板",
    [
      {
        id: "arch:client",
        text: "Web / App",
        type: "archActor",
        x: 120,
        y: 160,
        width: 140,
        height: 70,
      },
      {
        id: "arch:gateway",
        text: "API Gateway",
        type: "archComponent",
        x: 360,
        y: 160,
        width: 150,
        height: 80,
      },
      {
        id: "arch:service",
        text: "业务服务",
        type: "archService",
        x: 600,
        y: 100,
        width: 150,
        height: 80,
      },
      {
        id: "arch:worker",
        text: "异步任务",
        type: "archService",
        x: 600,
        y: 240,
        width: 150,
        height: 80,
      },
      { id: "arch:db", text: "数据库", type: "database", x: 860, y: 100, width: 130, height: 90 },
      { id: "arch:cache", text: "缓存", type: "database", x: 860, y: 250, width: 130, height: 90 },
      {
        id: "arch:cloud",
        text: "第三方服务",
        type: "archCloud",
        x: 1080,
        y: 160,
        width: 150,
        height: 90,
      },
    ],
    [
      { id: "arch:e1", from: "arch:client", to: "arch:gateway", fromSide: "right", toSide: "left" },
      { id: "arch:e2", from: "arch:gateway", to: "arch:service", fromSide: "right", toSide: "left" },
      { id: "arch:e3", from: "arch:gateway", to: "arch:worker", fromSide: "bottom", toSide: "left" },
      { id: "arch:e4", from: "arch:service", to: "arch:db", fromSide: "right", toSide: "left" },
      { id: "arch:e5", from: "arch:service", to: "arch:cache", fromSide: "bottom", toSide: "left" },
      { id: "arch:e6", from: "arch:service", to: "arch:cloud", fromSide: "right", toSide: "left" },
    ],
  );
}

function swimlaneCollaborationTemplate(): TemplateDefinition {
  return defineTemplate(
    "已插入泳道协作流程模板",
    [
      { id: "swim:lane1", text: "申请人", type: "swimlane", x: 80, y: 80, width: 980, height: 110 },
      { id: "swim:lane2", text: "审批人", type: "swimlane", x: 80, y: 210, width: 980, height: 110 },
      { id: "swim:lane3", text: "系统", type: "swimlane", x: 80, y: 340, width: 980, height: 110 },
      { id: "swim:submit", text: "提交申请", type: "process", x: 170, y: 115, width: 120, height: 54 },
      { id: "swim:review", text: "审批", type: "process", x: 390, y: 245, width: 120, height: 54 },
      { id: "swim:notify", text: "发送通知", type: "process", x: 610, y: 375, width: 120, height: 54 },
      { id: "swim:archive", text: "归档", type: "startEnd", x: 830, y: 375, width: 120, height: 54 },
    ],
    [
      { id: "swim:e1", from: "swim:submit", to: "swim:review", fromSide: "right", toSide: "left" },
      { id: "swim:e2", from: "swim:review", to: "swim:notify", fromSide: "right", toSide: "left" },
      { id: "swim:e3", from: "swim:notify", to: "swim:archive", fromSide: "right", toSide: "left" },
    ],
  );
}
