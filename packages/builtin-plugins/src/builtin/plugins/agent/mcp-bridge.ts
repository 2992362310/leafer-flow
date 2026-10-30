import type Editor from "@leafer-flow/core/editor";
import {
    MCP_MAX_MESSAGE_BYTES, MCP_READ_ONLY_TOOLS, isMcpToolName, isRecord, parseMcpBridgeRequest,
    type McpBridgeRequest, type McpBridgeResult, type McpToolDescriptor,
} from "@leafer-flow/mcp/protocol";
import { getAgentTools, validateToolArguments } from "./agent-tools";

const targetedTools = new Set(["set_style", "modify_text"]);

export function getMcpToolDescriptors(allowWrite: boolean): McpToolDescriptor[] {
    return getAgentTools().flatMap((tool) => {
        if (!isMcpToolName(tool.name) || (!allowWrite && !MCP_READ_ONLY_TOOLS.includes(tool.name))) return [];
        return [{
            name: tool.name,
            description: tool.description,
            inputSchema: {
                ...tool.parameters,
                required: [...new Set([...(tool.parameters.required ?? []), ...(targetedTools.has(tool.name) ? ["ids"] : [])])],
                additionalProperties: false as const,
            },
        }];
    });
}

export async function executeMcpRequest(
    editor: Editor,
    request: McpBridgeRequest,
    allowWrite: boolean,
    signal: AbortSignal,
): Promise<McpBridgeResult> {
    const result = (success: boolean, text: string): McpBridgeResult => ({ type: "result", id: request.id, success, result: text });
    try {
        signal.throwIfAborted();
        if (request.kind === "resource") {
            if (request.name === "document") return result(true, JSON.stringify(editor.document.snapshot()));
            if (request.name === "selection") {
                const tool = getAgentTools().find((candidate) => candidate.name === "get_selection_info")!;
                return result(true, await tool.execute(editor, {}));
            }
            throw new Error("未授权的 MCP 资源");
        }
        if (!getMcpToolDescriptors(allowWrite).some((tool) => tool.name === request.name)) throw new Error("此工具未获得当前浏览器会话的授权");
        const tool = getAgentTools().find((candidate) => candidate.name === request.name)!;
        validateToolArguments(tool, request.arguments);
        if (targetedTools.has(tool.name) && !Object.hasOwn(request.arguments, "ids")) throw new Error("MCP 修改必须显式指定目标文档 ids");
        const modifiesDocument = !MCP_READ_ONLY_TOOLS.includes(request.name as (typeof MCP_READ_ONLY_TOOLS)[number]);
        if (modifiesDocument) editor.beginTransaction();
        try {
            signal.throwIfAborted();
            return result(true, await tool.execute(editor, request.arguments));
        } finally {
            if (modifiesDocument) editor.endTransaction();
        }
    } catch (error) {
        return result(false, signal.aborted ? "MCP 请求已取消，部分修改可能已完成，请先查询文档确认。" : error instanceof Error ? error.message : "MCP 执行失败");
    }
}

export interface ConnectionOptions {
    port: number;
    token: string;
    allowWrite: boolean;
}

export class EditorMcpBridge {
    private socket?: WebSocket;
    private readonly requests = new Map<string, AbortController>();
    private queue: Promise<void> = Promise.resolve();
    private revision = 0;
    private connectedDocumentId?: string;
    private unsubscribe?: () => void;
    private connectionTimer?: ReturnType<typeof setTimeout>;

    constructor(private readonly editor: Editor, private readonly onStatus: (status: "disconnected" | "connecting" | "connected", error?: string, sessionId?: string) => void) { }

    connect(options: ConnectionOptions): void {
        if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error("请输入有效的本机端口");
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(options.token)) throw new Error("本机令牌格式无效");
        this.disconnect();
        const revision = this.revision;
        const sessionId = crypto.randomUUID();
        this.connectedDocumentId = this.editor.document.snapshot().id;
        const documentId = this.connectedDocumentId;
        const socket = new WebSocket(`ws://127.0.0.1:${options.port}/mcp`, ["leafer-flow-mcp", `token.${options.token}`]);
        this.socket = socket;
        this.onStatus("connecting");
        this.connectionTimer = setTimeout(() => {
            if (this.socket === socket) { this.disconnect(); this.onStatus("disconnected", "MCP 连接超时，请确认本地服务和允许来源。"); }
        }, 8000);
        const finish = (error?: string) => {
            if (this.socket !== socket) return;
            this.disconnect();
            this.onStatus("disconnected", error);
        };
        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: "hello", session: { id: sessionId, name: `Leafer Flow / ${documentId.slice(0, 8)}`, documentId },
                tools: getMcpToolDescriptors(options.allowWrite),
            }));
        };
        socket.onerror = () => finish("无法连接 MCP：请检查服务、来源白名单和本机令牌。");
        socket.onclose = () => finish("MCP 已断开。未确认结果的操作可能已执行，请先查询文档。");
        socket.onmessage = (event: MessageEvent) => {
            try {
                if (typeof event.data !== "string" || new TextEncoder().encode(event.data).length > MCP_MAX_MESSAGE_BYTES) throw new Error("MCP 消息过大或格式无效");
                const message: unknown = JSON.parse(event.data);
                if (isRecord(message) && message.type === "ready" && message.sessionId === sessionId) {
                    clearTimeout(this.connectionTimer);
                    this.connectionTimer = undefined;
                    this.onStatus("connected", undefined, sessionId);
                    return;
                }
                if (isRecord(message) && message.type === "cancel" && typeof message.id === "string") {
                    this.requests.get(message.id)?.abort();
                    return;
                }
                const request = parseMcpBridgeRequest(message);
                if (this.requests.has(request.id) || this.requests.size >= 16) throw new Error("MCP 请求重复或队列已满");
                const controller = new AbortController();
                this.requests.set(request.id, controller);
                this.queue = this.queue.then(async () => {
                    if (revision !== this.revision || this.socket !== socket) return;
                    if (this.editor.document.snapshot().id !== documentId) { finish("文档已切换，请重新授权 MCP 连接。"); return; }
                    let result = await executeMcpRequest(this.editor, request, options.allowWrite, controller.signal);
                    if (new TextEncoder().encode(JSON.stringify(result)).length > MCP_MAX_MESSAGE_BYTES) {
                        result = { type: "result", id: request.id, success: false, result: "结果超过 2 MiB，修改可能已经完成；请使用 search_elements 缩小查询，不要直接重试修改。" };
                    }
                    if (this.socket === socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(result));
                }).catch(() => finish("MCP 请求处理异常，连接已关闭，请查询文档确认结果。"))
                    .finally(() => { if (this.requests.get(request.id) === controller) this.requests.delete(request.id); });
            } catch {
                finish("MCP 收到无效请求，连接已关闭。");
            }
        };
        this.unsubscribe = this.editor.document.subscribe(() => {
            if (this.editor.document.snapshot().id !== this.connectedDocumentId) finish("文档已切换，请重新授权 MCP 连接。");
        });
    }

    disconnect(): void {
        this.revision++;
        clearTimeout(this.connectionTimer);
        this.connectionTimer = undefined;
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        for (const controller of this.requests.values()) controller.abort();
        this.requests.clear();
        const socket = this.socket;
        this.socket = undefined;
        if (socket) {
            socket.onopen = socket.onmessage = socket.onclose = null;
            socket.onerror = () => undefined;
            socket.close();
        }
        this.onStatus("disconnected");
    }
}
