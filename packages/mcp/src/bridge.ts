import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import {
    MCP_MAX_MESSAGE_BYTES, MCP_REQUEST_TIMEOUT_MS, isMcpToolName, isRecord,
    type McpBridgeRequest, type McpBridgeResult, type McpSessionInfo, type McpToolDescriptor,
} from "./protocol.js";

interface BrowserSession extends McpSessionInfo {
    socket: WebSocket;
    tools: McpToolDescriptor[];
}

interface PendingRequest {
    sessionId: string;
    finish: (result?: McpBridgeResult, error?: Error) => void;
}

export interface BridgeOptions {
    token: string;
    port: number;
    origins: string[];
    timeoutMs?: number;
}

function parseHello(value: unknown): { session: McpSessionInfo; tools: McpToolDescriptor[] } {
    if (!isRecord(value) || value.type !== "hello" || !isRecord(value.session) || !Array.isArray(value.tools)) {
        throw new Error("浏览器会话格式无效");
    }
    const { id, name, documentId } = value.session;
    if ([id, name, documentId].some((field) => typeof field !== "string" || !field || field.length > 200)) {
        throw new Error("浏览器会话标识无效");
    }
    if (!value.tools.length || value.tools.length > 8) throw new Error("浏览器工具目录无效");
    const names = new Set<string>();
    for (const tool of value.tools) {
        if (
            !isRecord(tool) || !isMcpToolName(tool.name) || names.has(tool.name) ||
            typeof tool.description !== "string" || tool.description.length > 2000 ||
            !isRecord(tool.inputSchema) || tool.inputSchema.type !== "object" ||
            !isRecord(tool.inputSchema.properties) || Object.hasOwn(tool.inputSchema.properties, "session_id") ||
            tool.inputSchema.additionalProperties !== false
        ) throw new Error("浏览器发布了未授权或无效的工具");
        const properties = tool.inputSchema.properties;
        const required = tool.inputSchema.required;
        if (required !== undefined && (!Array.isArray(required) || required.some((key) => typeof key !== "string" || !Object.hasOwn(properties, key)))) {
            throw new Error("浏览器工具必填参数无效");
        }
        names.add(tool.name);
    }
    return { session: { id, name, documentId } as McpSessionInfo, tools: value.tools as unknown as McpToolDescriptor[] };
}

export class BrowserBridge {
    private readonly http: HttpServer;
    private readonly websocket: WebSocketServer;
    private readonly sessions = new Map<string, BrowserSession>();
    private readonly pending = new Map<string, PendingRequest>();
    private readonly options: BridgeOptions;
    onSessionsChanged?: () => void;

    constructor(options: BridgeOptions) {
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(options.token)) throw new Error("MCP 令牌必须为 32-128 位安全随机字符");
        this.options = options;
        this.http = createServer((_request, response) => {
            response.writeHead(404, { "Cache-Control": "no-store" });
            response.end();
        });
        this.websocket = new WebSocketServer({
            noServer: true,
            maxPayload: MCP_MAX_MESSAGE_BYTES,
            handleProtocols: () => "leafer-flow-mcp",
        });
        this.http.on("upgrade", (request, socket, head) => {
            const address = this.http.address();
            const port = address && typeof address !== "string" ? address.port : options.port;
            const protocols = request.headers["sec-websocket-protocol"]?.split(",").map((part) => part.trim()) ?? [];
            const supplied = protocols.find((protocol) => protocol.startsWith("token."))?.slice(6) ?? "";
            const expected = Buffer.from(options.token);
            const actual = Buffer.from(supplied);
            if (
                request.url !== "/mcp" || request.headers.host !== `127.0.0.1:${port}` ||
                !request.headers.origin || !options.origins.includes(request.headers.origin) ||
                !protocols.includes("leafer-flow-mcp") || actual.length !== expected.length ||
                !timingSafeEqual(actual, expected)
            ) {
                socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
                return;
            }
            this.websocket.handleUpgrade(request, socket, head, (client) => this.accept(client));
        });
    }

    async listen(): Promise<number> {
        await new Promise<void>((resolve, reject) => {
            this.http.once("error", reject);
            this.http.listen(this.options.port, "127.0.0.1", () => { this.http.removeListener("error", reject); resolve(); });
        });
        const address = this.http.address();
        if (!address || typeof address === "string") throw new Error("无法启动 MCP 本地桥接");
        return address.port;
    }

    listSessions(): McpSessionInfo[] {
        return [...this.sessions.values()].map(({ id, name, documentId }) => ({ id, name, documentId }));
    }

    listTools(): McpToolDescriptor[] {
        const tools = new Map<string, McpToolDescriptor>();
        for (const session of this.sessions.values()) {
            for (const tool of session.tools) tools.set(tool.name, tool);
        }
        return [...tools.values()];
    }

    request(sessionId: string, request: Omit<McpBridgeRequest, "type" | "id">, signal?: AbortSignal): Promise<McpBridgeResult> {
        signal?.throwIfAborted();
        const session = this.sessions.get(sessionId);
        if (!session || session.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("目标会话未连接，请先 list_sessions"));
        if (request.kind === "tool" && !session.tools.some((tool) => tool.name === request.name)) {
            return Promise.reject(new Error("目标会话未授权此工具，请在编辑器中启用写入权限或重新选择会话"));
        }
        if (this.pending.size >= 32) return Promise.reject(new Error("MCP 请求过多，请等待当前操作结束"));
        const id = randomUUID();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => cancel("MCP 请求超时"), this.options.timeoutMs ?? MCP_REQUEST_TIMEOUT_MS);
            const finish = (result?: McpBridgeResult, error?: Error) => {
                if (!this.pending.delete(id)) return;
                clearTimeout(timer);
                signal?.removeEventListener("abort", onAbort);
                if (error) reject(error);
                else if (result) resolve(result);
            };
            const cancel = (reason: string) => {
                if (session.socket.readyState === WebSocket.OPEN) session.socket.send(JSON.stringify({ type: "cancel", id }));
                finish(undefined, new Error(`${reason}。操作结果未知，可能已执行；请查询画布确认，不要直接重试修改。`));
            };
            const onAbort = () => cancel("MCP 请求已取消");
            this.pending.set(id, { sessionId, finish });
            signal?.addEventListener("abort", onAbort, { once: true });
            session.socket.send(JSON.stringify({ type: "request", id, ...request }), (error) => {
                if (error) finish(undefined, new Error("MCP 发送失败，操作结果未知；请重新连接并查询画布确认。"));
            });
        });
    }

    async close(): Promise<void> {
        for (const client of this.websocket.clients) client.terminate();
        for (const request of this.pending.values()) request.finish(undefined, new Error("MCP 服务已关闭，操作结果未知"));
        this.sessions.clear();
        await new Promise<void>((resolve) => this.websocket.close(() => resolve()));
        if (this.http.listening) await new Promise<void>((resolve) => this.http.close(() => resolve()));
    }

    private accept(socket: WebSocket) {
        let sessionId: string | undefined;
        const timer = setTimeout(() => socket.close(1008, "Session registration timeout"), 5000);
        socket.on("error", () => socket.terminate());
        socket.on("message", (data, binary) => {
            try {
                if (binary) throw new Error("仅支持 JSON 消息");
                const value: unknown = JSON.parse(data.toString());
                if (!sessionId) {
                    const { session, tools } = parseHello(value);
                    if (this.sessions.size >= 16 || this.sessions.has(session.id)) throw new Error("会话已存在或数量超过限制");
                    for (const tool of tools) {
                        const existing = this.listTools().find((candidate) => candidate.name === tool.name);
                        if (existing && JSON.stringify(existing) !== JSON.stringify(tool)) throw new Error("浏览器工具版本不一致，请刷新编辑器");
                    }
                    sessionId = session.id;
                    this.sessions.set(sessionId, { ...session, tools, socket });
                    clearTimeout(timer);
                    socket.send(JSON.stringify({ type: "ready", sessionId }));
                    this.onSessionsChanged?.();
                    return;
                }
                if (!isRecord(value) || value.type !== "result" || typeof value.id !== "string" || typeof value.success !== "boolean" || typeof value.result !== "string") {
                    throw new Error("无效的工具结果");
                }
                const pending = this.pending.get(value.id);
                if (pending?.sessionId === sessionId) pending.finish(value as unknown as McpBridgeResult);
            } catch {
                socket.close(1008, "Invalid bridge message");
            }
        });
        socket.on("close", () => {
            clearTimeout(timer);
            if (!sessionId) return;
            this.sessions.delete(sessionId);
            for (const pending of this.pending.values()) {
                if (pending.sessionId === sessionId) pending.finish(undefined, new Error("浏览器已断开，操作结果未知；重连后请先查询画布。"));
            }
            this.onSessionsChanged?.();
        });
    }
}
