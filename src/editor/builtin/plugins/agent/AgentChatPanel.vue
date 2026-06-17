<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type Editor from "@/editor/editor";
import { useDraggable, useCollapsible } from "@/composables/useDraggable";
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
const { position, isDragging, startDrag } = useDraggable({
  initialX: window.innerWidth - 380,
  initialY: 70,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);

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
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages));
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

// 发送消息
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

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  try {
    // 调用 Agent 服务
    const response = await agentService.processMessage(message);

    // 添加 AI 响应到显示列表
    displayMessages.value.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    displayMessages.value.push({
      role: "assistant",
      content: `错误: ${errorMessage}`,
    });
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
      // 更新显示消息，添加摘要消息
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
      v-if="!isCollapsed"
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span class="text-xs font-bold">AI 助手</span>
          <span
            v-if="!isReady"
            class="badge badge-warning badge-xs"
          >
            未配置
          </span>
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
          <!-- 压缩历史按钮 -->
          <button
            v-if="shouldCompress && isReady"
            class="btn btn-ghost btn-xs btn-square"
            title="压缩历史"
            :disabled="isCompressing"
            @click.stop="handleCompressHistory"
          >
            <span v-if="isCompressing" class="loading loading-spinner loading-xs"></span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364" />
            </svg>
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="设置"
            @click.stop="showSettings = !showSettings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="清空历史"
            @click.stop="handleClearHistory"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="折叠"
            @click.stop="toggleCollapse(isDragging)"
          >
            <span class="text-sm">∨</span>
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
        <div v-if="displayMessages.length === 0" class="text-center text-xs text-base-content/50 py-8">
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
        />

        <!-- 加载状态 -->
        <AgentMessage v-if="isLoading" role="assistant" content="" :is-loading="true" />
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

  <!-- 折叠状态的按钮 -->
  <Transition name="slide-fade">
    <button
      v-if="isCollapsed"
      class="btn btn-sm fixed z-20 shadow-lg"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }"
      @click="toggleCollapse(isDragging)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      AI 助手
    </button>
  </Transition>
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
