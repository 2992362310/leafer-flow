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

const SYSTEM_PROMPT = `你是 Leafer Flow 流程图编辑器的 AI 助手。你可以帮助用户：

1. 创建各种图形（矩形、圆形、流程图节点、BPMN 节点、架构图节点等）
2. 执行编辑操作（删除、复制、粘贴、撤销、重做等）
3. 调整布局（对齐、分布、编组、图层顺序等）
4. 修改样式（填充色、边框色、透明度等）
5. 插入预设模板（审批流程、判断分支、系统架构等）
6. 文件操作（保存、导出 PNG/SVG）
7. 视图控制（缩放、适应画布）

请根据用户的描述，调用合适的工具完成操作。如果用户的描述不清晰，可以询问确认。
回复时使用简洁的中文，说明执行了什么操作和结果。`;

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

    // 提取需要压缩的早期消息（保留最近的一半）
    const keepCount = Math.floor(this.config.maxHistoryMessages / 2);
    const toCompress = this.history.slice(0, -keepCount);
    const toKeep = this.history.slice(-keepCount);

    if (toCompress.length === 0) {
      return { success: true, message: "历史消息较少，无需压缩" };
    }

    try {
      // 构建摘要请求
      const summaryMessages: ChatMessage[] = [
        { role: "system", content: SUMMARY_PROMPT },
        ...toCompress.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: "请对以上对话进行摘要。" },
      ];

      // 调用 LLM 生成摘要
      const response = await this.callLLM(summaryMessages, false);

      if (response.choices && response.choices.length > 0) {
        const summary = response.choices[0].message.content || "无法生成摘要";

        // 用摘要替换早期历史
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

    // 添加用户消息到历史
    this.history.push({ role: "user", content: userMessage });

    // 自动截断：保留最近的 maxHistoryMessages 条消息
    if (this.history.length > this.config.maxHistoryMessages) {
      this.history = this.history.slice(-this.config.maxHistoryMessages);
    }

    const allToolCalls: ToolCallResult[] = [];
    let toolCallCount = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // 构建消息列表
        const messages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...this.history,
        ];

        // 调用 LLM API
        const response = await this.callLLM(messages);

        // 处理响应
        if (response.choices && response.choices.length > 0) {
          const choice = response.choices[0];
          const assistantMessage = choice.message;

          // 添加助手消息到历史
          this.history.push({
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: assistantMessage.tool_calls,
          });

          // 如果没有工具调用，返回文本响应
          if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return {
              content: assistantMessage.content || "操作完成",
              toolCalls: allToolCalls,
            };
          }

          // 执行工具调用
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

            // 添加工具结果到历史
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
