<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type Editor from "@/editor/editor";
import { useDraggable, useCollapsible } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";
import { loadAgentConfig, saveAgentConfig, isConfigValid, type AgentConfig } from "./agent-config";
import { AgentService, type ToolCallResult } from "./agent-service";
import AgentMessage from "./AgentMessage.vue";
import AgentSettings from "./AgentSettings.vue";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

// localStorage key
const HISTORY_STORAGE_KEY = "leafer-flow.plugin.agent.history";

// UI 状态
const { position, isDragging, hasMoved, startDrag } = useDraggable({
  initialX: window.innerWidth - 380,
  initialY: 70,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("agent-chat");

// 消息状态
const inputMessage = ref("");
const isLoading = ref(false);
const isCompressing = ref(false);
const showSettings = ref(false);
const messagesContainerRef = ref<HTMLElement | null>(null);

// 配置和 Agent 服务
const config = ref<AgentConfig>(loadAgentConfig());
const agentService = new AgentService(props.editor, config.value);

// 消息历史（用于 UI 渲染）
interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
  isStreaming?: boolean;
}

// 从 localStorage 加载历史
function loadHistory(): DisplayMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as DisplayMessage[];
  } catch {
    return [];
  }
}

// 保存历史到 localStorage
function saveHistory(messages: DisplayMessage[]) {
  try {
    // 不保存正在流式传输的消息
    const toSave = messages.filter((msg) => !msg.isStreaming);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn("保存对话历史失败", error);
  }
}

const displayMessages = ref<DisplayMessage[]>(loadHistory());

// 监听消息变化，自动保存
watch(
  displayMessages,
  (newMessages) => {
    saveHistory(newMessages);
  },
  { deep: true },
);

// 配置是否有效
const isReady = computed(() => isConfigValid(config.value));

// 历史消息数量
const historyCount = computed(() => agentService.getHistoryLength());
const maxHistory = computed(() => agentService.getMaxHistory());
const shouldCompress = computed(() => agentService.shouldCompress());

// 发送消息（流式）
async function handleSend() {
  const message = inputMessage.value.trim();
  if (!message || isLoading.value) return;

  // 添加用户消息到显示列表
  displayMessages.value.push({
    role: "user",
    content: message,
  });
  inputMessage.value = "";
  isLoading.value = true;

  // 添加一个空的 AI 消息用于流式更新
  const aiMessageIndex = displayMessages.value.length;
  displayMessages.value.push({
    role: "assistant",
    content: "",
    isStreaming: true,
  });

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  try {
    await agentService.processMessageStream(message, {
      onToken: (token) => {
        // 流式更新消息内容
        displayMessages.value[aiMessageIndex].content += token;
        scrollToBottom();
      },
      onToolCall: (toolCall) => {
        // 显示工具调用状态
        const currentContent = displayMessages.value[aiMessageIndex].content;
        displayMessages.value[aiMessageIndex].content =
          currentContent + (currentContent ? "\n" : "") + `🔧 调用 ${toolCall.name}...`;
        scrollToBottom();
      },
      onToolResult: (result) => {
        // 显示工具执行结果
        const currentContent = displayMessages.value[aiMessageIndex].content;
        const toolCallText = `🔧 调用 ${result.name}...`;
        const resultText =
          result.result.length > 50 ? result.result.substring(0, 50) + "..." : result.result;

        // 替换最后的工具调用文本为结果
        displayMessages.value[aiMessageIndex].content = currentContent.replace(
          toolCallText,
          `✅ ${result.name}: ${resultText}`,
        );
        scrollToBottom();
      },
      onComplete: (response) => {
        // 流式完成，更新最终内容
        displayMessages.value[aiMessageIndex].content = response.content;
        displayMessages.value[aiMessageIndex].isStreaming = false;
        if (response.toolCalls.length > 0) {
          displayMessages.value[aiMessageIndex].toolCalls = response.toolCalls;
        }
        scrollToBottom();
      },
      onError: (error) => {
        // 错误处理
        displayMessages.value[aiMessageIndex].content = `错误: ${error}`;
        displayMessages.value[aiMessageIndex].isStreaming = false;
        scrollToBottom();
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    displayMessages.value[aiMessageIndex].content = `错误: ${errorMessage}`;
    displayMessages.value[aiMessageIndex].isStreaming = false;
  } finally {
    isLoading.value = false;
    await nextTick();
    scrollToBottom();
  }
}

// 压缩历史
async function handleCompressHistory() {
  if (isCompressing.value || !isReady.value) return;

  isCompressing.value = true;

  try {
    const result = await agentService.compressHistory();

    if (result.success && result.summary) {
      const keepCount = Math.floor(maxHistory.value / 2);
      displayMessages.value = [
        {
          role: "assistant",
          content: `📝 已压缩历史对话\n\n${result.summary}`,
        },
        ...displayMessages.value.slice(-keepCount),
      ];
    }
  } catch (error) {
    console.error("压缩历史失败", error);
  } finally {
    isCompressing.value = false;
  }
}

// 清空历史
function handleClearHistory() {
  displayMessages.value = [];
  agentService.clearHistory();
  saveHistory([]);
}

// 保存配置
function handleSaveConfig(newConfig: AgentConfig) {
  config.value = newConfig;
  saveAgentConfig(newConfig);
  agentService.updateConfig(newConfig);
  showSettings.value = false;
}

// 滚动到底部
function scrollToBottom() {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
  }
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="!isCollapsed && mode === 'float'"
      class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '22rem',
        height: '70vh',
      }"
    >
      <!-- 标题栏 -->
      <div
        class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
        @mousedown="startDrag"
      >
        <div class="flex items-center gap-2">
          <Icon name="agent" class="h-4 w-4" />
          <span class="text-xs font-bold">AI 助手</span>
          <span v-if="!isReady" class="badge badge-warning badge-xs"> 未配置 </span>
          <span
            v-else-if="shouldCompress"
            class="badge badge-info badge-xs cursor-pointer"
            title="点击压缩历史"
            @click.stop="handleCompressHistory"
          >
            {{ historyCount }}/{{ maxHistory }}
          </span>
        </div>
        <div class="flex gap-1">
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="收纳到右侧槽"
            @click.stop="togglePanelDock('agent-chat')"
            @mousedown.stop
          >
            <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
          </button>
          <!-- 压缩历史按钮 -->
          <button
            v-if="shouldCompress && isReady"
            class="btn btn-ghost btn-xs btn-square"
            title="压缩历史"
            :disabled="isCompressing"
            @click.stop="handleCompressHistory"
            @mousedown.stop
          >
            <span v-if="isCompressing" class="loading loading-spinner loading-xs"></span>
            <Icon v-else name="compress" class="h-3.5 w-3.5" />
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="设置"
            @click.stop="showSettings = !showSettings"
            @mousedown.stop
          >
            <Icon name="settings" class="h-3.5 w-3.5" />
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="清空历史"
            @click.stop="handleClearHistory"
            @mousedown.stop
          >
            <Icon name="clear" class="h-3.5 w-3.5" />
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="折叠"
            @click.stop="toggleCollapse(hasMoved)"
            @mousedown.stop
          >
            <Icon name="arrow-down" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- 设置面板 -->
      <div v-if="showSettings" class="p-3 border-b border-base-200 bg-base-100">
        <AgentSettings :config="config" @save="handleSaveConfig" @close="showSettings = false" />
      </div>

      <!-- 历史状态提示 -->
      <div
        v-if="shouldCompress && isReady && !showSettings"
        class="px-3 py-1.5 bg-info/10 text-info text-[11px] flex items-center justify-between"
      >
        <span>历史消息较多 ({{ historyCount }}/{{ maxHistory }})</span>
        <button
          class="btn btn-info btn-xs h-5 min-h-0"
          :disabled="isCompressing"
          @click="handleCompressHistory"
        >
          {{ isCompressing ? "压缩中..." : "压缩历史" }}
        </button>
      </div>

      <!-- 消息列表 -->
      <div
        ref="messagesContainerRef"
        class="flex-1 overflow-y-auto p-3 space-y-3"
        :style="{
          height: showSettings
            ? 'calc(70vh - 20rem)'
            : shouldCompress && isReady
              ? 'calc(70vh - 10rem)'
              : 'calc(70vh - 8rem)',
        }"
      >
        <!-- 欢迎消息 -->
        <div
          v-if="displayMessages.length === 0"
          class="text-center text-xs text-base-content/50 py-8"
        >
          <p class="mb-2">👋 你好！我是 AI 助手</p>
          <p>告诉我你想做什么，比如：</p>
          <p class="mt-1">"创建一个审批流程"</p>
          <p>"把这些元素居中对齐"</p>
          <p>"保存文件"</p>
        </div>

        <!-- 消息列表 -->
        <AgentMessage
          v-for="(msg, index) in displayMessages"
          :key="index"
          :role="msg.role"
          :content="msg.content"
          :tool-calls="msg.toolCalls"
          :is-loading="msg.isStreaming && !msg.content"
        />

        <!-- 加载状态 -->
        <AgentMessage
          v-if="isLoading && !displayMessages.some((m) => m.isStreaming)"
          role="assistant"
          content=""
          :is-loading="true"
        />
      </div>

      <!-- 输入区域 -->
      <div class="p-2 border-t border-base-200 bg-base-100">
        <div v-if="!isReady" class="text-center text-xs text-warning py-2">
          请先点击设置按钮配置 API
        </div>
        <div v-else class="join w-full">
          <input
            v-model="inputMessage"
            type="text"
            placeholder="输入指令..."
            class="input input-bordered input-xs join-item flex-1"
            :disabled="isLoading"
            @keydown="handleKeydown"
          />
          <button
            class="btn btn-primary btn-xs join-item"
            :disabled="isLoading || !inputMessage.trim()"
            @click="handleSend"
          >
            {{ isLoading ? "..." : "发送" }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 折叠状态按钮 -->
  <Transition name="slide-fade">
    <button
      v-if="isCollapsed && mode === 'float'"
      class="btn btn-sm fixed z-20 shadow-lg cursor-move"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }"
      @mousedown="startDrag"
      @click="toggleCollapse(hasMoved)"
    >
      <Icon name="agent" class="h-4 w-4" />
      AI 助手
    </button>
  </Transition>

  <PanelFlyoutWrapper
    v-if="mode === 'flyout'"
    panel-id="agent-chat"
    title="AI 助手"
    icon="agent"
    :width="352"
  >
    <div class="flex flex-col" style="height: calc(100vh - 8rem)">
      <div v-if="showSettings" class="p-3 border-b border-base-200 bg-base-100">
        <AgentSettings :config="config" @save="handleSaveConfig" @close="showSettings = false" />
      </div>
      <div
        v-if="shouldCompress && isReady && !showSettings"
        class="px-3 py-1.5 bg-info/10 text-info text-[11px] flex items-center justify-between"
      >
        <span>历史消息较多 ({{ historyCount }}/{{ maxHistory }})</span>
        <button
          class="btn btn-info btn-xs h-5 min-h-0"
          :disabled="isCompressing"
          @click="handleCompressHistory"
        >
          {{ isCompressing ? "压缩中..." : "压缩历史" }}
        </button>
      </div>
      <div ref="messagesContainerRef" class="flex-1 overflow-y-auto p-3 space-y-3">
        <div
          v-if="displayMessages.length === 0"
          class="text-center text-xs text-base-content/50 py-8"
        >
          <p class="mb-2">👋 你好！我是 AI 助手</p>
          <p>告诉我你想做什么，比如：</p>
          <p class="mt-1">"创建一个审批流程"</p>
        </div>
        <AgentMessage
          v-for="(msg, index) in displayMessages"
          :key="index"
          :role="msg.role"
          :content="msg.content"
          :tool-calls="msg.toolCalls"
          :is-loading="msg.isStreaming && !msg.content"
        />
        <AgentMessage
          v-if="isLoading && !displayMessages.some((m) => m.isStreaming)"
          role="assistant"
          content=""
          :is-loading="true"
        />
      </div>
      <div class="p-2 border-t border-base-200 bg-base-100 shrink-0">
        <div v-if="!isReady" class="text-center text-xs text-warning py-2">
          请先点击设置按钮配置 API
        </div>
        <div v-else class="join w-full">
          <input
            v-model="inputMessage"
            type="text"
            placeholder="输入指令..."
            class="input input-bordered input-xs join-item flex-1"
            :disabled="isLoading"
            @keydown="handleKeydown"
          />
          <button
            class="btn btn-primary btn-xs join-item"
            :disabled="isLoading || !inputMessage.trim()"
            @click="handleSend"
          >
            {{ isLoading ? "..." : "发送" }}
          </button>
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(16px);
  opacity: 0;
}
</style>
