/**
 * Template Registry and Management
 *
 * Centralizes template metadata and access for the builtin templates system.
 * This module bridges core template definitions with plugin registration.
 */

import { getTemplateStyle, templateMap, type TemplateKind } from "../../templates/defs";
import type { TemplateDefinition } from "../../templates/defs";

/**
 * Template registry that exposes core template definitions.
 * Allows safe access and future extensibility (custom templates, version control, etc.)
 */
export class TemplateRegistry {
  /**
   * Get all available template kinds
   */
  static getAvailableKinds(): TemplateKind[] {
    return Object.keys(templateMap) as TemplateKind[];
  }

  /**
   * Get template definition by kind
   */
  static getTemplate(kind: TemplateKind): TemplateDefinition | null {
    if (!templateMap[kind]) return null;
    return templateMap[kind]();
  }

  /**
   * Get style for a flow node kind (used when inserting templates)
   */
  static getNodeStyle = getTemplateStyle;

  /**
   * Check if a template kind is valid
   */
  static isValidKind(kind: string): kind is TemplateKind {
    return kind in templateMap;
  }

  /**
   * Get human-readable name for a template kind
   */
  static getTemplateName(kind: TemplateKind): string {
    const nameMap: Record<TemplateKind, string> = {
      approval: "审批流程",
      decision: "判断分支",
      workOrder: "工单流转",
      crm: "CRM 跟进",
      login: "登录注册流程",
      payment: "支付流程",
      bpmnOrder: "BPMN 订单流程",
      systemArchitecture: "系统架构图",
      swimlaneCollaboration: "泳道协作流程",
    };
    return nameMap[kind] || kind;
  }
}

/**
 * Export for convenience (legacy compatibility)
 */
export { templateMap, getTemplateStyle } from "../../templates/defs";
export type { TemplateKind, TemplateDefinition } from "../../templates/defs";
