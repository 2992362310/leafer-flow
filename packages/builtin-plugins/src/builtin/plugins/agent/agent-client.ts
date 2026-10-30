import { getApiEndpoint, type AgentConfig } from "./agent-config";

export interface ToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

interface Completion {
    error?: { message?: string };
    choices?: Array<{
        finish_reason?: string | null;
        message?: { content?: string | null; tool_calls?: ToolCall[] };
        delta?: {
            content?: string;
            tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
            }>;
        };
    }>;
}

export interface ModelReply {
    content: string;
    toolCalls: ToolCall[];
}

interface RequestOptions {
    signal: AbortSignal;
    tools?: readonly Record<string, unknown>[];
    onToken?: (token: string) => void;
}

function validateToolCalls(calls: ToolCall[]) {
    const ids = new Set<string>();
    for (const call of calls) {
        if (
            !call?.id ||
            ids.has(call.id) ||
            call.type !== "function" ||
            !call.function?.name ||
            typeof call.function.arguments !== "string"
        ) {
            throw new Error("工具调用响应不完整或 ID 重复");
        }
        ids.add(call.id);
    }
}

function checkCompletion(completion: Completion) {
    if (completion.error) throw new Error(completion.error.message || "API 响应错误");
    const reason = completion.choices?.[0]?.finish_reason;
    if (reason === "length" || reason === "content_filter")
        throw new Error("模型响应被截断，未执行不完整的工具调用");
}

export async function requestChat(
    config: AgentConfig,
    messages: ChatMessage[],
    options: RequestOptions,
): Promise<ModelReply> {
    const response = await fetch(getApiEndpoint(config), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature,
            stream: Boolean(options.onToken),
            ...(options.tools?.length ? { tools: options.tools, tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(60_000)]),
    });
    if (!response.ok) throw new Error(`API 请求失败 (${response.status}): ${await response.text()}`);

    if (!options.onToken) {
        const completion: Completion = await response.json();
        checkCompletion(completion);
        const message = completion.choices?.[0]?.message;
        if (!message) throw new Error("API 响应格式错误");
        const toolCalls = message.tool_calls ?? [];
        validateToolCalls(toolCalls);
        return { content: message.content ?? "", toolCalls };
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");
    const decoder = new TextDecoder();
    const calls = new Map<number, ToolCall>();
    let content = "";
    let buffer = "";
    let completed = false;
    let ended = false;
    const readLine = (line: string) => {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data) return;
        if (data === "[DONE]") {
            completed = ended = true;
            return;
        }
        const completion: Completion = JSON.parse(data);
        checkCompletion(completion);
        const choice = completion.choices?.[0];
        if (choice?.finish_reason) completed = true;
        const delta = choice?.delta;
        if (delta?.content) {
            content += delta.content;
            options.onToken?.(delta.content);
        }
        for (const call of delta?.tool_calls ?? []) {
            const current = calls.get(call.index) ?? {
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
            };
            if (call.id) current.id = call.id;
            current.function.name += call.function?.name ?? "";
            current.function.arguments += call.function?.arguments ?? "";
            calls.set(call.index, current);
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
                if (ended) break;
            }
            if (done && buffer.trim()) readLine(buffer.trim());
            if (done || ended) break;
        }
        if (!completed) throw new Error("响应流意外中断，请重试");
        const toolCalls = [...calls.entries()]
            .sort(([first], [second]) => first - second)
            .map(([, call]) => call);
        validateToolCalls(toolCalls);
        return { content, toolCalls };
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
