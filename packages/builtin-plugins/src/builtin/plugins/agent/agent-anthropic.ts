import type { AgentConfig } from "./agent-config";
import type { ChatMessage, ModelReply, RequestOptions, ToolCall } from "./agent-client";

interface ContentBlock {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
}

interface AnthropicReply {
    type?: string;
    content?: ContentBlock[];
    stop_reason?: string | null;
    error?: { message?: string };
    index?: number;
    content_block?: ContentBlock;
    delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string | null };
}

function convertMessages(messages: ChatMessage[]) {
    const converted: { role: "user" | "assistant"; content: ContentBlock[] }[] = [];
    for (const message of messages) {
        if (message.role === "system") continue;
        const role = message.role === "assistant" ? "assistant" : "user";
        const content: ContentBlock[] = [];
        if (message.role === "tool") {
            const result = JSON.parse(message.content) as { success?: boolean };
            content.push({ type: "tool_result", tool_use_id: message.tool_call_id, content: message.content, is_error: result.success === false });
        } else {
            if (message.content) content.push({ type: "text", text: message.content });
            for (const call of message.tool_calls ?? []) {
                content.push({ type: "tool_use", id: call.id, name: call.function.name, input: JSON.parse(call.function.arguments) });
            }
        }
        if (!content.length) continue;
        const previous = converted.at(-1);
        if (previous?.role === role) previous.content.push(...content);
        else converted.push({ role, content });
    }
    return converted;
}

function checkReply(reply: AnthropicReply) {
    if (reply.error || reply.type === "error") throw new Error(reply.error?.message || "Claude API 响应错误");
    const reason = reply.stop_reason ?? reply.delta?.stop_reason;
    if (reason && !["end_turn", "tool_use", "stop_sequence"].includes(reason)) {
        throw new Error(`Claude 响应未完整结束 (${reason})，未执行工具调用`);
    }
}

function serializeInput(input: unknown): string {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Claude 工具参数必须为对象");
    return JSON.stringify(input);
}

export async function requestAnthropic(
    config: AgentConfig,
    endpoint: string,
    messages: ChatMessage[],
    options: RequestOptions,
): Promise<ModelReply> {
    const tools = options.tools?.map((tool) => {
        const definition = tool.function as { name: string; description: string; parameters: Record<string, unknown> };
        return { name: definition.name, description: definition.description, input_schema: definition.parameters };
    });
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: 4096,
            system: messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n"),
            messages: convertMessages(messages),
            stream: Boolean(options.onToken),
            ...(tools?.length ? { tools, tool_choice: { type: options.toolChoice === "required" ? "any" : "auto" } } : {}),
        }),
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(60_000)]),
    });
    if (!response.ok) throw new Error(`Claude API 请求失败 (${response.status}): ${await response.text()}`);
    if (!options.onToken) {
        const reply: AnthropicReply = await response.json();
        checkReply(reply);
        if (!Array.isArray(reply.content) || !reply.stop_reason) throw new Error("Claude API 响应格式错误");
        return {
            content: reply.content.filter((block) => block.type === "text").map((block) => block.text ?? "").join(""),
            toolCalls: reply.content.filter((block) => block.type === "tool_use").map((block) => ({
                id: block.id ?? "", type: "function", function: { name: block.name ?? "", arguments: serializeInput(block.input) },
            })),
        };
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取 Claude 响应流");
    const decoder = new TextDecoder();
    const calls = new Map<number, ToolCall>();
    let content = "";
    let buffer = "";
    let completed = false;
    let stopReason: string | null | undefined;
    const readLine = (line: string) => {
        if (!line.startsWith("data:")) return;
        const reply: AnthropicReply = JSON.parse(line.slice(5).trim());
        checkReply(reply);
        if (reply.type === "message_delta") stopReason = reply.delta?.stop_reason;
        if (reply.type === "message_stop") completed = true;
        if (reply.type === "content_block_start" && reply.content_block?.type === "tool_use") {
            if (typeof reply.index !== "number" || calls.has(reply.index)) throw new Error("Claude 工具块索引无效");
            const block = reply.content_block;
            calls.set(reply.index, {
                id: block.id ?? "", type: "function",
                function: { name: block.name ?? "", arguments: block.input && Object.keys(block.input).length ? serializeInput(block.input) : "" },
            });
        }
        if (reply.type === "content_block_delta" && reply.delta?.type === "text_delta") {
            const token = reply.delta.text ?? "";
            content += token;
            options.onToken?.(token);
        }
        if (reply.type === "content_block_delta" && reply.delta?.type === "input_json_delta") {
            const call = typeof reply.index === "number" ? calls.get(reply.index) : undefined;
            if (!call) throw new Error("Claude 工具参数缺少对应工具块");
            call.function.arguments += reply.delta.partial_json ?? "";
        }
    };
    try {
        while (true) {
            const { done, value } = await reader.read();
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                readLine(line.trim());
                if (completed) break;
            }
            if (done && buffer.trim() && !completed) readLine(buffer.trim());
            if (done || completed) break;
        }
        if (!completed || !stopReason) throw new Error("Claude 响应流意外中断，未执行工具调用");
        const toolCalls = [...calls.entries()].sort(([left], [right]) => left - right).map(([, call]) => {
            call.function.arguments = serializeInput(JSON.parse(call.function.arguments || "{}"));
            return call;
        });
        return { content, toolCalls };
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
