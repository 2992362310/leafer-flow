import { computed, onUnmounted, reactive, ref, shallowRef } from "vue";
import type Editor from "@leafer-flow/core/editor";
import { AgentService, parseToolResult, type ToolCallResult } from "./agent-service";
import { isConfigValid, loadAgentConfig, saveAgentConfig, type AgentConfig } from "./agent-config";
import type { ChatMessage } from "./agent-client";
import { validateUserAnswer, type UserAnswer, type UserQuestion } from "./agent-question";

const HISTORY_STORAGE_KEY = "leafer-flow.plugin.agent.history";

export interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCallResult[];
  isStreaming?: boolean;
}

function displayHistory(history: ChatMessage[]): DisplayMessage[] {
  const messages: DisplayMessage[] = [];
  for (const message of history) {
    if (message.role === "tool") {
      const target = messages.at(-1);
      if (target?.role === "assistant") {
        target.toolCalls.push(parseToolResult(message.content));
      }
    } else {
      messages.push({
        role: message.role === "user" ? "user" : "assistant",
        content: message.content,
        toolCalls: [],
      });
    }
  }
  return messages;
}

export function useAgentChat(editor: Editor) {
  const config = ref(loadAgentConfig());
  const service = new AgentService(editor, config.value);
  const status = ref<"idle" | "sending" | "compressing">("idle");
  const inputMessage = ref("");
  const activeTool = ref("");
  const error = ref("");
  const pendingQuestion = shallowRef<UserQuestion>();
  let resolveQuestion: ((answer: UserAnswer) => void) | undefined;
  const history = shallowRef<ChatMessage[]>([]);
  const messages = ref<DisplayMessage[]>([]);
  const isReady = computed(() => isConfigValid(config.value));
  const isBusy = computed(() => status.value !== "idle");
  const historyCount = computed(() => history.value.length);
  const maxHistory = computed(() => config.value.maxHistoryMessages);
  const shouldCompress = computed(() => historyCount.value > maxHistory.value);
  let disposed = false;

  function askQuestion(question: UserQuestion, signal: AbortSignal): Promise<UserAnswer> {
    signal.throwIfAborted();
    if (disposed) return Promise.reject(new Error("面板已关闭"));
    return new Promise((resolve, reject) => {
      pendingQuestion.value = { ...question, options: [...question.options] };
      const cleanup = () => {
        pendingQuestion.value = undefined;
        resolveQuestion = undefined;
        signal.removeEventListener("abort", onAbort);
      };
      const onAbort = () => { cleanup(); reject(signal.reason); };
      resolveQuestion = (answer) => { cleanup(); resolve(answer); };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function answerQuestion(answer: UserAnswer) {
    if (!pendingQuestion.value || !resolveQuestion) return;
    try {
      const validated = validateUserAnswer(pendingQuestion.value, answer);
      error.value = "";
      resolveQuestion(validated);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "回答无效";
    }
  }

  function sync() {
    history.value = service.getHistory();
    messages.value = displayHistory(history.value);
  }

  function persist() {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.value));
    } catch (cause) {
      error.value = `保存对话失败: ${cause instanceof Error ? cause.message : "未知错误"}`;
    }
  }

  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) service.restoreHistory(JSON.parse(raw));
    sync();
  } catch {
    service.clearHistory();
    sync();
  }

  async function send() {
    const text = inputMessage.value.trim();
    if (!text || isBusy.value || !isReady.value) return;
    status.value = "sending";
    inputMessage.value = "";
    error.value = "";
    messages.value.push({ role: "user", content: text, toolCalls: [] });
    const reply = reactive<DisplayMessage>({
      role: "assistant",
      content: "",
      toolCalls: [],
      isStreaming: true,
    });
    messages.value.push(reply);
    try {
      const result = await service.processMessage(text, {
        onQuestion: askQuestion,
        onToken(token) {
          if (!disposed) reply.content += token;
        },
        onToolCall(call) {
          activeTool.value = call.name;
        },
        onToolResult(result) {
          if (!disposed) reply.toolCalls.push(result);
          if (!result.success) error.value = `工具 ${result.name} 执行失败：${result.result}`;
          activeTool.value = "";
        },
      });
      if (!disposed && result.warning) error.value = result.warning;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "发送失败";
    } finally {
      status.value = "idle";
      activeTool.value = "";
      if (!disposed) {
        sync();
        persist();
      }
    }
  }

  async function compress() {
    if (isBusy.value || !isReady.value) return;
    status.value = "compressing";
    error.value = "";
    try {
      const result = await service.compressHistory();
      if (!result.success) error.value = result.message ?? "压缩失败";
    } finally {
      status.value = "idle";
      if (!disposed) {
        sync();
        persist();
      }
    }
  }

  function clear() {
    if (isBusy.value) return;
    service.clearHistory();
    error.value = "";
    sync();
    persist();
  }

  function saveConfig(value: AgentConfig) {
    if (isBusy.value) return false;
    if (!isConfigValid(value)) {
      error.value = "请填写有效的 API 地址、API Key、模型和参数";
      return false;
    }
    saveAgentConfig(value);
    service.updateConfig(value);
    config.value = value;
    error.value = "";
    return true;
  }

  onUnmounted(() => {
    disposed = true;
    service.cancel();
  });

  return {
    config,
    status,
    inputMessage,
    activeTool,
    pendingQuestion,
    answerQuestion,
    error,
    messages,
    isReady,
    isBusy,
    historyCount,
    maxHistory,
    shouldCompress,
    send,
    compress,
    clear,
    saveConfig,
    cancel: () => service.cancel(),
  };
}
