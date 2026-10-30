import type Editor from "@leafer-flow/core/editor";
import { type AgentConfig, isConfigValid } from "./agent-config";
import { getAgentTools, validateToolArguments } from "./agent-tools";
import { requestChat, type ChatMessage, type ToolCall } from "./agent-client";

export interface AgentResponse {
  content: string;
  toolCalls: ToolCallResult[];
}

export interface ToolCallResult {
  name: string;
  arguments: Record<string, unknown>;
  success: boolean;
  result: string;
}

export function parseToolResult(content: string): ToolCallResult {
  const result = JSON.parse(content) as ToolCallResult | null;
  if (
    !result ||
    typeof result.name !== "string" ||
    typeof result.success !== "boolean" ||
    typeof result.result !== "string" ||
    !result.arguments ||
    typeof result.arguments !== "object" ||
    Array.isArray(result.arguments)
  ) {
    throw new Error("无效的工具执行结果");
  }
  return result;
}

export interface CompressResult {
  success: boolean;
  summary?: string;
  message?: string;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: { name: string; arguments: Record<string, unknown> }) => void;
  onToolResult?: (result: ToolCallResult) => void;
}

const SYSTEM_PROMPT = `你是 Leafer Flow 编辑器的 AI 助手，使用工具完成用户的画布编辑需求，用简洁中文报告实际结果。
工具及参数以提供的 Schema 为准，不要猜测不存在的能力。
- “选中的”“这些”指当前选区。不确定目标时先查询或询问用户。
- 搜索与创建返回稳定文档 ID。修改指定目标时传入 ids；省略 ids 才操作当前选区。
- 连接节点必须传入文档 ID，不能使用名称或列表序号。
- 批量创建使用 batch_create_shapes，文字使用 modify_text，样式与几何属性使用 set_style。
- 文字和样式工具自动处理节点内部结构，不要修改渲染子元素。
- 工具结果 success=false 代表失败，不要宣称已完成。中断后先查询画布再决定是否重试，避免重复创建。
- 用户询问能力时可使用 list_tools/get_tool_details 获取最新目录。`;

const SUMMARY_PROMPT = `请对以下对话历史进行简洁的摘要，保留关键信息：
- 用户创建了哪些图形
- 执行了哪些重要操作
- 当前画布的状态
- 用户的偏好或习惯

摘要应该简洁明了，不超过 200 字。`;

const MAX_TOOL_CALLS = 10;

export class AgentService {
  private editor: Editor;
  private config: AgentConfig;
  private history: ChatMessage[] = [];
  private readonly tools = new Map(getAgentTools().map((tool) => [tool.name, tool]));
  private readonly toolsSchema = getAgentTools().map(({ name, description, parameters }) => ({
    type: "function",
    function: { name, description, parameters },
  }));
  private operation?: AbortController;

  constructor(editor: Editor, config: AgentConfig) {
    this.editor = editor;
    this.config = config;
  }

  updateConfig(config: AgentConfig): void {
    if (this.operation) throw new Error("请先停止当前请求");
    this.config = config;
  }

  clearHistory(): void {
    if (this.operation) throw new Error("请先停止当前请求");
    this.history = [];
  }

  cancel(): void {
    this.operation?.abort();
  }

  restoreHistory(messages: ChatMessage[]): void {
    if (this.operation) throw new Error("请求进行中，无法恢复历史");
    if (
      !Array.isArray(messages) ||
      messages.some(
        (message) =>
          !message ||
          !["system", "user", "assistant", "tool"].includes(message.role) ||
          typeof message.content !== "string" ||
          (message.role === "tool" && typeof message.tool_call_id !== "string") ||
          (message.tool_calls !== undefined &&
            (message.role !== "assistant" ||
              !Array.isArray(message.tool_calls) ||
              message.tool_calls.some(
                (call) =>
                  !call ||
                  typeof call.id !== "string" ||
                  call.type !== "function" ||
                  !call.function ||
                  typeof call.function.name !== "string" ||
                  typeof call.function.arguments !== "string",
              ))),
      )
    ) {
      throw new Error("无效的对话历史");
    }
    for (const message of messages) {
      if (message.role === "tool") parseToolResult(message.content);
    }
    this.history = structuredClone(messages);
    this.completePendingCalls();
    this.trimHistory();
  }

  private completePendingCalls() {
    const complete: ChatMessage[] = [];
    let pending = new Map<string, ToolCall>();
    const finish = () => {
      for (const [id, call] of pending)
        complete.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify({
            name: call.function.name,
            arguments: {},
            success: false,
            result: "操作已中断，未执行或结果未知。请查询画布确认。",
          }),
        });
      pending = new Map();
    };
    for (const message of this.history) {
      if (message.role === "tool") {
        if (message.tool_call_id && pending.delete(message.tool_call_id)) complete.push(message);
      } else {
        finish();
        complete.push(message);
        pending = new Map(message.tool_calls?.map((call) => [call.id, call]));
      }
    }
    finish();
    this.history = complete;
  }

  private trimHistory() {
    while (this.history.length > this.config.maxHistoryMessages) {
      const nextTurn = this.history.findIndex(
        (message, index) => index > 0 && message.role === "user",
      );
      if (nextTurn < 0) break;
      this.history = this.history.slice(nextTurn);
    }
  }

  private startOperation() {
    if (this.operation) throw new Error("已有请求正在执行");
    this.operation = new AbortController();
    return this.operation;
  }

  getCanvasContext(): string {
    try {
      const elementCount = this.editor.app.tree.children.length;
      const scale = this.editor.app.tree.scaleX || 1;
      const zoomPercent = Math.round(scale * 100);

      const selected = this.editor.app.editor.list;
      let selectionInfo = "无选中元素";
      if (selected && selected.length > 0) {
        const names = selected
          .map((el) => el.name || el.tag || "未命名")
          .slice(0, 5)
          .join(", ");
        selectionInfo = `已选中 ${selected.length} 个元素: ${names}${selected.length > 5 ? "..." : ""}`;
      }

      return `\n[当前画布状态] 元素总数: ${elementCount}, 缩放: ${zoomPercent}%, ${selectionInfo}`;
    } catch {
      return "";
    }
  }

  getHistory(): ChatMessage[] {
    return structuredClone(this.history);
  }

  async compressHistory(): Promise<CompressResult> {
    if (this.operation) return { success: false, message: "请等待当前请求结束" };
    if (this.history.length === 0) {
      return { success: true, message: "没有历史消息需要压缩" };
    }

    const keepCount = Math.max(1, Math.floor(this.config.maxHistoryMessages / 2));
    const boundary = this.history.findIndex(
      (message, index) => index >= this.history.length - keepCount && message.role === "user",
    );
    if (boundary < 1) return { success: true, message: "没有可压缩的完整旧对话" };
    const toCompress = this.history.slice(0, boundary);
    const toKeep = this.history.slice(boundary);

    const operation = this.startOperation();
    try {
      const summaryMessages: ChatMessage[] = [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: JSON.stringify(toCompress) },
      ];

      const response = await requestChat(this.config, summaryMessages, {
        signal: operation.signal,
      });
      operation.signal.throwIfAborted();

      if (response.content.trim()) {
        const summary = response.content;

        this.history = [{ role: "system", content: `[对话摘要] ${summary}` }, ...toKeep];

        return {
          success: true,
          summary,
          message: `已压缩 ${toCompress.length} 条消息`,
        };
      }

      return { success: false, message: "生成摘要失败" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return { success: false, message: `压缩失败: ${errorMessage}` };
    } finally {
      this.operation = undefined;
    }
  }

  async processMessage(
    userMessage: string,
    callbacks: StreamCallbacks = {},
  ): Promise<AgentResponse> {
    if (!isConfigValid(this.config)) {
      throw new Error("请先在设置中配置 API URL 和 API Key。");
    }
    const operation = this.startOperation();
    this.history.push({ role: "user", content: userMessage });
    this.trimHistory();
    const allToolCalls: ToolCallResult[] = [];
    let toolCallCount = 0;

    try {
      while (true) {
        operation.signal.throwIfAborted();
        const messages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT + this.getCanvasContext() },
          ...this.history,
        ];
        const { content, toolCalls } = await requestChat(this.config, messages, {
          signal: operation.signal,
          tools: this.toolsSchema,
          onToken: callbacks.onToken,
        });
        operation.signal.throwIfAborted();
        const replyContent = content || (toolCalls.length ? "" : "操作完成");
        this.history.push({
          role: "assistant",
          content: replyContent,
          ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
        });
        if (!toolCalls.length) return { content: replyContent, toolCalls: allToolCalls };

        for (const toolCall of toolCalls) {
          operation.signal.throwIfAborted();
          let result: ToolCallResult;
          if (toolCallCount >= MAX_TOOL_CALLS) {
            result = {
              name: toolCall.function.name,
              arguments: {},
              success: false,
              result: "已达到工具调用上限，此操作未执行。",
            };
          } else {
            toolCallCount++;
            this.editor.beginTransaction();
            try {
              result = await this.executeToolCall(toolCall, callbacks.onToolCall);
            } finally {
              this.editor.endTransaction();
            }
          }
          allToolCalls.push(result);
          this.history.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
          callbacks.onToolResult?.(result);
        }
        if (toolCallCount >= MAX_TOOL_CALLS) {
          const limitMessage = "已达到工具调用上限，已停止执行。已完成的修改予以保留。";
          this.history.push({ role: "assistant", content: limitMessage });
          return { content: limitMessage, toolCalls: allToolCalls };
        }
      }
    } catch (error) {
      const content = operation.signal.aborted
        ? "已停止，已完成的修改予以保留。"
        : `处理消息时出错: ${error instanceof Error ? error.message : "未知错误"}`;
      this.completePendingCalls();
      this.history.push({ role: "assistant", content });
      return { content, toolCalls: allToolCalls };
    } finally {
      this.completePendingCalls();
      this.operation = undefined;
    }
  }

  private async executeToolCall(
    toolCall: ToolCall,
    onStart?: StreamCallbacks["onToolCall"],
  ): Promise<ToolCallResult> {
    const { name, arguments: argsStr } = toolCall.function;

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsStr);
      if (!args || typeof args !== "object" || Array.isArray(args))
        throw new Error("参数必须为对象");
    } catch {
      return {
        name,
        arguments: {},
        success: false,
        result: `参数解析失败: ${argsStr}`,
      };
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        name,
        arguments: args,
        success: false,
        result: `未知工具: ${name}`,
      };
    }

    try {
      validateToolArguments(tool, args);
      onStart?.({ name, arguments: args });
      const result = await tool.execute(this.editor, args);
      return {
        name,
        arguments: args,
        success: true,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        name,
        arguments: args,
        success: false,
        result: `执行失败: ${errorMessage}`,
      };
    }
  }
}
