import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema,
  ReadResourceRequestSchema, ErrorCode, McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { BrowserBridge } from "./bridge.js";
import { isMcpToolName, MCP_READ_ONLY_TOOLS, type McpResourceName } from "./protocol.js";

export function createMcpServer(bridge: BrowserBridge): Server {
  const server = new Server({ name: "leafer-flow", version: "0.1.0" }, {
    capabilities: { tools: { listChanged: true }, resources: { listChanged: true } },
    instructions: "操作前先 list_sessions 确认用户授权的编辑器会话。调用工具必须传 session_id。创建和搜索返回稳定文档 ID；不要使用名称代替 ID。修改工具可能已执行后才发生超时或断线，此时先读取文档，不要直接重试。只报告实际工具结果。",
  });
  bridge.onSessionsChanged = () => {
    void server.notification({ method: "notifications/tools/list_changed" }).catch(() => undefined);
    void server.notification({ method: "notifications/resources/list_changed" }).catch(() => undefined);
  };
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_sessions", description: "列出用户在浏览器中授权连接的 Leafer Flow 编辑器；修改前确认目标 session_id。",
        inputSchema: { type: "object" as const, properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      ...bridge.listTools().map((tool) => ({
        name: tool.name, description: tool.description,
        inputSchema: {
          ...tool.inputSchema,
          properties: { ...tool.inputSchema.properties, session_id: { type: "string", description: "list_sessions 返回的目标会话 ID" } },
          required: [...(tool.inputSchema.required ?? []), "session_id"],
        },
        annotations: {
          readOnlyHint: MCP_READ_ONLY_TOOLS.includes(tool.name),
          destructiveHint: !MCP_READ_ONLY_TOOLS.includes(tool.name),
          openWorldHint: false,
        },
      })),
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const args = request.params.arguments ?? {};
    if (request.params.name === "list_sessions") {
      if (Object.keys(args).length) throw new McpError(ErrorCode.InvalidParams, "list_sessions 不接受参数");
      const sessions = bridge.listSessions();
      return { content: [{ type: "text" as const, text: JSON.stringify({ sessions, ...(!sessions.length ? { message: "请打开 Leafer Flow 的 MCP 连接面板，填写本机令牌并显式连接。" } : {}) }) }] };
    }
    if (!isMcpToolName(request.params.name)) throw new McpError(ErrorCode.InvalidParams, "未知或未授权的工具");
    if (typeof args.session_id !== "string" || !args.session_id) throw new McpError(ErrorCode.InvalidParams, "必须指定 list_sessions 返回的 session_id");
    const { session_id: sessionId, ...toolArgs } = args;
    try {
      const result = await bridge.request(sessionId, { kind: "tool", name: request.params.name, arguments: toolArgs }, extra.signal);
      return { content: [{ type: "text" as const, text: result.result }], isError: !result.success };
    } catch (error) {
      return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "MCP 执行失败，结果未知" }], isError: true };
    }
  });
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: bridge.listSessions().flatMap((session) => ["document", "selection"].map((name) => ({
      uri: `leafer-flow://session/${encodeURIComponent(session.id)}/${name}`,
      name: `${session.name} / ${name === "document" ? "当前文档" : "当前选区"}`,
      mimeType: "application/json",
    }))),
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    let uri: URL;
    try { uri = new URL(request.params.uri); }
    catch { throw new McpError(ErrorCode.InvalidParams, "无效的资源 URI"); }
    const [, encodedId, name, ...rest] = uri.pathname.split("/");
    if (uri.protocol !== "leafer-flow:" || uri.host !== "session" || uri.search || uri.hash || rest.length || !encodedId || !["document", "selection"].includes(name ?? "")) {
      throw new McpError(ErrorCode.InvalidParams, "仅支持已授权会话的文档和选区资源");
    }
    const result = await bridge.request(decodeURIComponent(encodedId), { kind: "resource", name: name as McpResourceName, arguments: {} }, extra.signal);
    if (!result.success) throw new McpError(ErrorCode.InternalError, result.result);
    return { contents: [{ uri: request.params.uri, mimeType: "application/json", text: result.result }] };
  });
  return server;
}
