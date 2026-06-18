import type Editor from "../../../editor";
import { type AgentConfig, getApiEndpoint, isConfigValid } from "./agent-config";
import { getAgentTools, getToolsSchema } from "./agent-tools";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentResponse {
  content: string;
  toolCalls: ToolCallResult[];
}

export interface ToolCallResult {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
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
  onComplete?: (response: AgentResponse) => void;
  onError?: (error: string) => void;
}

const SYSTEM_PROMPT = `你是 Leafer Flow 流程图编辑器的 AI 助手。你可以帮助用户：

1. 创建各种图形（矩形、圆形、流程图节点、BPMN 节点、架构图节点等）
2. 执行编辑操作（删除、复制、剪切、粘贴、原位复制、撤销、重做等）
3. 调整布局（对齐、分布、编组、图层顺序等）
4. 修改元素属性（位置、尺寸、填充色、边框、透明度、圆角等）— 使用 set_style 工具
5. 修改文字内容和文字样式（字号、颜色）— 使用 modify_text 工具
6. 搜索画布上的元素 — 使用 search_elements 工具
7. 连接两个元素 — 使用 connect_elements 工具
8. 插入预设模板（审批流程、判断分支、系统架构等）
9. 文件操作（保存、导出 PNG/SVG）
10. 视图控制（缩放、适应画布）

请根据用户的描述，调用合适的工具完成操作。如果用户的描述不清晰，可以询问确认。
回复时使用简洁的中文，说明执行了什么操作和结果。

重要提示：
- 当用户说"选中的"、"这些"、"它们"时，指的是当前选中元素
- 大部分图形是 Group 结构（包含形状子元素和文字子元素）
- set_style 工具会自动将样式属性应用到形状子元素
- modify_text 工具会自动找到文字子元素进行修改
- 当用户说"改成红色"等修改样式的指令时，使用 set_style 的 fill 参数
- 当用户说"改成 200x100"等修改尺寸的指令时，使用 set_style 的 width 和 height 参数
- 当用户说"移到左上角"等修改位置的指令时，使用 set_style 的 x 和 y 参数
- 当用户说"改文字为 xxx"时，使用 modify_text 的 text 参数
- 当用户说"把所有xxx改成红色"等批量操作时，先用 search_elements 搜索，再用 set_style 修改
- 当用户说"连接 A 和 B"时，使用 connect_elements 工具
- 创建图形时，如果没有指定位置，可以创建在画布中心附近
- 使用 get_selection_info 工具可以获取选中元素的详细信息，包括子元素结构`;

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
  private tools: ReturnType<typeof getAgentTools>;

  constructor(editor: Editor, config: AgentConfig) {
    this.editor = editor;
    this.config = config;
    this.tools = getAgentTools();
  }

  updateConfig(config: AgentConfig): void {
    this.config = config;
  }

  clearHistory(): void {
    this.history = [];
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
    return [...this.history];
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  getMaxHistory(): number {
    return this.config.maxHistoryMessages;
  }

  shouldCompress(): boolean {
    return this.history.length > this.config.maxHistoryMessages;
  }

  async compressHistory(): Promise<CompressResult> {
    if (this.history.length === 0) {
      return { success: true, message: "没有历史消息需要压缩" };
    }

    const keepCount = Math.floor(this.config.maxHistoryMessages / 2);
    const toCompress = this.history.slice(0, -keepCount);
    const toKeep = this.history.slice(-keepCount);

    if (toCompress.length === 0) {
      return { success: true, message: "历史消息较少，无需压缩" };
    }

    try {
      const summaryMessages: ChatMessage[] = [
        { role: "system", content: SUMMARY_PROMPT },
        ...toCompress.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: "请对以上对话进行摘要。" },
      ];

      const response = await this.callLLM(summaryMessages, false);

      if (response.choices && response.choices.length > 0) {
        const summary = response.choices[0].message.content || "无法生成摘要";

        this.history = [
          { role: "system", content: `[对话摘要] ${summary}` },
          ...toKeep,
        ];

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
    }
  }

  async processMessage(userMessage: string): Promise<AgentResponse> {
    if (!isConfigValid(this.config)) {
      return {
        content: "请先在设置中配置 API URL 和 API Key。",
        toolCalls: [],
      };
    }

    this.history.push({ role: "user", content: userMessage });

    if (this.history.length > this.config.maxHistoryMessages) {
      this.history = this.history.slice(-this.config.maxHistoryMessages);
    }

    const allToolCalls: ToolCallResult[] = [];
    let toolCallCount = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const messages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT + this.getCanvasContext() },
          ...this.history,
        ];

        const response = await this.callLLM(messages);

        if (response.choices && response.choices.length > 0) {
          const choice = response.choices[0];
          const assistantMessage = choice.message;

          this.history.push({
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: assistantMessage.tool_calls,
          });

          if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return {
              content: assistantMessage.content || "操作完成",
              toolCalls: allToolCalls,
            };
          }

          toolCallCount++;
          if (toolCallCount > MAX_TOOL_CALLS) {
            return {
              content: "工具调用次数过多，已停止执行。",
              toolCalls: allToolCalls,
            };
          }

          for (const toolCall of assistantMessage.tool_calls) {
            const result = await this.executeToolCall(toolCall);
            allToolCalls.push(result);

            this.history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result.result,
            });
          }
        } else {
          return {
            content: "API 响应格式错误",
            toolCalls: allToolCalls,
          };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        content: `处理消息时出错: ${errorMessage}`,
        toolCalls: allToolCalls,
      };
    }
  }

  async processMessageStream(
    userMessage: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    if (!isConfigValid(this.config)) {
      callbacks.onError?.("请先在设置中配置 API URL 和 API Key。");
      return;
    }

    this.history.push({ role: "user", content: userMessage });

    if (this.history.length > this.config.maxHistoryMessages) {
      this.history = this.history.slice(-this.config.maxHistoryMessages);
    }

    const allToolCalls: ToolCallResult[] = [];
    let toolCallCount = 0;
    let fullContent = "";

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const messages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT + this.getCanvasContext() },
          ...this.history,
        ];

        const { content, toolCalls } = await this.callLLMStream(messages, callbacks.onToken);

        fullContent += content;

        if (toolCalls && toolCalls.length > 0) {
          this.history.push({
            role: "assistant",
            content: fullContent,
            tool_calls: toolCalls,
          });

          toolCallCount++;
          if (toolCallCount > MAX_TOOL_CALLS) {
            const response: AgentResponse = {
              content: fullContent + "\n\n工具调用次数过多，已停止执行。",
              toolCalls: allToolCalls,
            };
            callbacks.onComplete?.(response);
            return;
          }

          for (const toolCall of toolCalls) {
            const parsedArgs = this.parseToolCallArguments(toolCall);
            callbacks.onToolCall?.({ name: toolCall.function.name, arguments: parsedArgs });

            const result = await this.executeToolCall(toolCall);
            allToolCalls.push(result);
            callbacks.onToolResult?.(result);

            this.history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result.result,
            });
          }

          fullContent = "";
        } else {
          this.history.push({
            role: "assistant",
            content: fullContent,
          });

          const response: AgentResponse = {
            content: fullContent || "操作完成",
            toolCalls: allToolCalls,
          };
          callbacks.onComplete?.(response);
          return;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      callbacks.onError?.(`处理消息时出错: ${errorMessage}`);
    }
  }

  private parseToolCallArguments(toolCall: ToolCall): Record<string, unknown> {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      return {};
    }
  }

  private async callLLM(
    messages: ChatMessage[],
    useTools = true,
  ): Promise<Record<string, unknown>> {
    const endpoint = getApiEndpoint(this.config);
    const tools = useTools ? getToolsSchema() : [];

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  private async callLLMStream(
    messages: ChatMessage[],
    onToken?: (token: string) => void,
  ): Promise<{ content: string; toolCalls: ToolCall[] | null }> {
    const endpoint = getApiEndpoint(this.config);
    const tools = getToolsSchema();

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      stream: true,
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    const decoder = new TextDecoder();
    let content = "";
    let buffer = "";
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              content += delta.content;
              onToken?.(delta.content);
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? 0;
                const existing = toolCallsMap.get(index) || { id: "", name: "", arguments: "" };

                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;

                toolCallsMap.set(index, existing);
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const toolCalls = toolCallsMap.size > 0
      ? Array.from(toolCallsMap.values()).map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        }))
      : null;

    return { content, toolCalls };
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ToolCallResult> {
    const { name, arguments: argsStr } = toolCall.function;

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsStr);
    } catch {
      return {
        name,
        arguments: {},
        result: `参数解析失败: ${argsStr}`,
      };
    }

    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return {
        name,
        arguments: args,
        result: `未知工具: ${name}`,
      };
    }

    try {
      const result = await tool.execute(this.editor, args);
      return {
        name,
        arguments: args,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        name,
        arguments: args,
        result: `执行失败: ${errorMessage}`,
      };
    }
  }
}
