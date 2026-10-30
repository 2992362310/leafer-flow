import { getApiEndpoint, type AgentConfig } from "./agent-config";
import { requestAnthropic } from "./agent-anthropic";

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

export interface RequestOptions {
  signal: AbortSignal;
  tools?: readonly Record<string, unknown>[];
  toolChoice?: "auto" | "required";
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
  if (config.provider === "anthropic") {
    const reply = await requestAnthropic(config, getApiEndpoint(config), messages, options);
    validateToolCalls(reply.toolCalls);
    return reply;
  }
  const response = await fetch(getApiEndpoint(config), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: Boolean(options.onToken),
      ...(options.tools?.length ? { tools: options.tools, tool_choice: options.toolChoice ?? "auto" } : {}),
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

export async function testToolCalling(config: AgentConfig, signal: AbortSignal): Promise<void> {
  const name = "verify_tool_call";
  const reply = await requestChat(config, [{ role: "user", content: `调用 ${name} 工具，参数为 {}。不要用文字模拟调用。` }], {
    signal,
    toolChoice: "required",
    tools: [{
      type: "function",
      function: {
        name,
        description: "验证结构化工具调用；不修改画布，无需参数。",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    }],
  });
  signal.throwIfAborted();
  if (reply.toolCalls.length !== 1 || reply.toolCalls[0]?.function.name !== name) {
    throw new Error("端点未返回要求的工具调用。请确认代理透传 tools/tool_choice，且模型支持 Function Calling；普通文字回复不代表工具可用。");
  }
  let args: unknown;
  try {
    args = JSON.parse(reply.toolCalls[0].function.arguments);
  } catch {
    throw new Error("模型返回的工具参数不是有效 JSON，请更换支持可靠工具调用的模型。");
  }
  if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) {
    throw new Error("模型未遵守工具参数 Schema，请更换支持可靠工具调用的模型。");
  }
}
