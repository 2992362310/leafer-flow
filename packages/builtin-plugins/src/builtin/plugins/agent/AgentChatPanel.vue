<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type Editor from "@leafer-flow/core/editor";
import {
  useDraggable,
  useCollapsible,
  usePanelDock,
  usePanelMode,
} from "@leafer-flow/ui/composables";
import { PanelFlyoutWrapper } from "@leafer-flow/ui/components";
import { useAgentChat } from "./useAgentChat";
import type { AgentConfig } from "./agent-config";
import AgentMessage from "./AgentMessage.vue";
import AgentSettings from "./AgentSettings.vue";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

const { position, hasMoved, startDrag } = useDraggable({
  initialX: window.innerWidth - 380,
  initialY: 70,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("agent-chat");

const showSettings = ref(false);
const messagesContainerRef = ref<HTMLElement | null>(null);
const {
  config,
  status,
  inputMessage,
  activeTool,
  error,
  messages: displayMessages,
  isReady,
  isBusy,
  historyCount,
  maxHistory,
  shouldCompress,
  send: handleSend,
  compress: handleCompressHistory,
  clear: handleClearHistory,
  saveConfig,
  cancel,
} = useAgentChat(props.editor);
const isLoading = computed(() => status.value === "sending");
const isCompressing = computed(() => status.value === "compressing");

function handleSaveConfig(newConfig: AgentConfig) {
  if (saveConfig(newConfig)) showSettings.value = false;
}

watch(
  displayMessages,
  async () => {
    await nextTick();
    const container = messagesContainerRef.value;
    if (container) container.scrollTop = container.scrollHeight;
  },
  { deep: true },
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <Transition name="slide-fade">
    <component :is="mode === 'flyout' ? PanelFlyoutWrapper : 'div'"
      v-if="mode === 'flyout' || (!isCollapsed && mode === 'float')" v-bind="mode === 'flyout'
          ? { panelId: 'agent-chat', title: 'AI 助手', icon: 'agent', width: 352 }
          : {}
        " :class="mode === 'float'
          ? 'shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 rounded-lg'
          : ''
        " :style="mode === 'float'
          ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: 'min(22rem, calc(100vw - 1rem))',
          }
          : {}
        ">
      <div class="flex flex-col min-h-0" style="height: min(70vh, calc(100vh - 9rem))">
        <!-- 标题栏 -->
        <div
          class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
          @mousedown="mode === 'float' && startDrag($event)">
          <div class="flex items-center gap-2">
            <Icon name="agent" class="h-4 w-4" />
            <span class="text-xs font-bold">AI 助手</span>
            <span v-if="!isReady" class="badge badge-warning badge-xs"> 未配置 </span>
            <span v-else-if="shouldCompress" class="badge badge-info badge-xs cursor-pointer" title="点击压缩历史"
              @click.stop="handleCompressHistory">
              {{ historyCount }}/{{ maxHistory }}
            </span>
          </div>
          <div class="flex gap-1">
            <button v-if="mode === 'float'" class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽"
              @click.stop="togglePanelDock('agent-chat')" @mousedown.stop>
              <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
            </button>
            <!-- 压缩历史按钮 -->
            <button v-if="shouldCompress && isReady" class="btn btn-ghost btn-xs btn-square" title="压缩历史"
              :disabled="isBusy" @click.stop="handleCompressHistory" @mousedown.stop>
              <span v-if="isCompressing" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="compress" class="h-3.5 w-3.5" />
            </button>
            <button class="btn btn-ghost btn-xs btn-square" title="设置" :disabled="isBusy"
              @click.stop="showSettings = !showSettings" @mousedown.stop>
              <Icon name="settings" class="h-3.5 w-3.5" />
            </button>
            <button class="btn btn-ghost btn-xs btn-square" title="清空历史" :disabled="isBusy"
              @click.stop="handleClearHistory" @mousedown.stop>
              <Icon name="clear" class="h-3.5 w-3.5" />
            </button>
            <button v-if="mode === 'float'" class="btn btn-ghost btn-xs btn-square" title="折叠"
              @click.stop="toggleCollapse(hasMoved)" @mousedown.stop>
              <Icon name="arrow-down" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- 设置面板 -->
        <div v-if="showSettings" class="p-3 border-b border-base-200 bg-base-100 max-h-[60%] overflow-y-auto shrink-0">
          <AgentSettings :config="config" @save="handleSaveConfig" @close="showSettings = false" />
        </div>

        <!-- 历史状态提示 -->
        <div v-if="shouldCompress && isReady && !showSettings"
          class="px-3 py-1.5 bg-info/10 text-info text-[11px] flex items-center justify-between">
          <span>历史消息较多 ({{ historyCount }}/{{ maxHistory }})</span>
          <button class="btn btn-info btn-xs h-5 min-h-0" :disabled="isBusy" @click="handleCompressHistory">
            {{ isCompressing ? "压缩中..." : "压缩历史" }}
          </button>
        </div>

        <!-- 消息列表 -->
        <div v-if="error" role="alert" class="px-3 py-2 text-xs text-error break-words">
          {{ error }}
        </div>
        <div ref="messagesContainerRef" class="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          <!-- 欢迎消息 -->
          <div v-if="displayMessages.length === 0" class="text-center text-xs text-base-content/50 py-8">
            <p class="mb-2">👋 你好！我是 AI 助手</p>
            <p>告诉我你想做什么，比如：</p>
            <p class="mt-1">"创建一个审批流程"</p>
            <p>"把这些元素居中对齐"</p>
            <p>"保存文件"</p>
          </div>

          <!-- 消息列表 -->
          <AgentMessage v-for="(msg, index) in displayMessages" :key="index" :role="msg.role" :content="msg.content"
            :tool-calls="msg.toolCalls" :is-loading="msg.isStreaming && !msg.content && !msg.toolCalls.length" />

          <!-- 加载状态 -->
          <AgentMessage v-if="isLoading && !displayMessages.some((m) => m.isStreaming)" role="assistant" content=""
            :is-loading="true" />
          <div v-if="activeTool" class="text-xs opacity-60">{{ activeTool }}</div>
        </div>

        <!-- 输入区域 -->
        <div class="p-2 border-t border-base-200 bg-base-100">
          <div v-if="!isReady" class="text-center text-xs text-warning py-2">
            请先点击设置按钮配置 API
          </div>
          <div v-else class="join w-full">
            <input v-model="inputMessage" type="text" placeholder="输入指令..."
              class="input input-bordered input-xs join-item flex-1 min-w-0" :disabled="isBusy"
              @keydown="handleKeydown" />
            <button v-if="!isBusy" class="btn btn-primary btn-xs join-item" :disabled="!inputMessage.trim()"
              @click="handleSend">
              发送
            </button>
            <button v-else class="btn btn-ghost btn-xs btn-square join-item" title="停止请求" aria-label="停止请求"
              @click="cancel">
              <Icon name="error" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </component>
  </Transition>

  <!-- 折叠状态按钮 -->
  <Transition name="slide-fade">
    <button v-if="isCollapsed && mode === 'float'" class="btn btn-sm fixed z-20 shadow-lg cursor-move" :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }" @mousedown="startDrag" @click="toggleCollapse(hasMoved)">
      <Icon name="agent" class="h-4 w-4" />
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
