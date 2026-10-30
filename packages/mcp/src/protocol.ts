export const MCP_TOOL_NAMES = [
  "get_canvas_info",
  "get_selection_info",
  "search_elements",
  "create_shape",
  "batch_create_shapes",
  "modify_text",
  "set_style",
  "connect_elements",
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];
export const MCP_READ_ONLY_TOOLS: readonly McpToolName[] = ["get_canvas_info", "get_selection_info", "search_elements"];
export type McpResourceName = "document" | "selection";
export const MCP_MAX_MESSAGE_BYTES = 2 * 1024 * 1024;
export const MCP_REQUEST_TIMEOUT_MS = 30_000;

export interface McpToolDescriptor {
  name: McpToolName;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
}

export interface McpSessionInfo {
  id: string;
  name: string;
  documentId: string;
}

export interface McpBridgeRequest {
  type: "request";
  id: string;
  kind: "tool" | "resource";
  name: McpToolName | McpResourceName;
  arguments: Record<string, unknown>;
}

export interface McpBridgeResult {
  type: "result";
  id: string;
  success: boolean;
  result: string;
}

export function isMcpToolName(name: unknown): name is McpToolName {
  return typeof name === "string" && MCP_TOOL_NAMES.some((candidate) => candidate === name);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseMcpBridgeRequest(value: unknown): McpBridgeRequest {
  if (
    !isRecord(value) || value.type !== "request" ||
    typeof value.id !== "string" || !value.id || value.id.length > 100 ||
    !isRecord(value.arguments) ||
    (value.kind !== "tool" && value.kind !== "resource") ||
    (value.kind === "tool" ? !isMcpToolName(value.name) : !["document", "selection"].includes(String(value.name)))
  ) throw new Error("无效或未授权的 MCP 请求");
  return value as unknown as McpBridgeRequest;
}
