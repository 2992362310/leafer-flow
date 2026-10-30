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
import { AGENT_PROVIDERS, type AgentConfig } from "./agent-config";
import AgentMessage from "./AgentMessage.vue";
import AgentSettings from "./AgentSettings.vue";
import AgentQuestion from "./AgentQuestion.vue";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

const { position, hasMoved, startDrag } = useDraggable({
  initialX: Math.max(8, window.innerWidth - 424),
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
  pendingQuestion,
  answerQuestion,
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
const providerName = computed(() => AGENT_PROVIDERS.find((provider) => provider.id === config.value.provider)?.name ?? "自定义模型");

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
      v-if="mode === 'flyout' || (!isCollapsed && mode === 'float')"
      v-bind="mode === 'flyout' ? { panelId: 'agent-chat', title: 'AI 助手', icon: 'agent', width: 400 } : {}"
      :class="{ 'agent-floating': mode === 'float' }" :style="mode === 'float' ? {
        left: `clamp(8px, ${position.x}px, calc(100vw - min(25rem, calc(100vw - 1rem)) - 8px))`,
        top: `clamp(8px, ${position.y}px, max(8px, calc(100dvh - min(42rem, calc(100dvh - 6rem)) - 8px)))`,
      } : {}">
      <section class="agent-shell" aria-label="AI 助手对话">
        <header class="agent-header" :class="{ 'agent-header--draggable': mode === 'float' }"
          @mousedown="mode === 'float' && startDrag($event)">
          <div class="agent-identity">
            <div class="agent-mark">
              <Icon name="agent" class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h2>AI 助手</h2>
              <div class="agent-model" :title="isReady ? `${providerName} · ${config.model}` : '尚未连接模型'">
                <span class="connection-dot" :class="{ 'connection-dot--ready': isReady }"></span>
                <span>{{ pendingQuestion ? '等待你的回答' : isLoading ? '正在处理' : isReady ? config.model : '尚未连接模型' }}</span>
              </div>
            </div>
          </div>
          <nav class="agent-actions" aria-label="对话操作" @mousedown.stop>
            <button v-if="shouldCompress && isReady" class="agent-icon-button" title="压缩历史" aria-label="压缩历史"
              :disabled="isBusy" @click="handleCompressHistory">
              <Icon name="compress" class="h-4 w-4" />
            </button>
            <button class="agent-icon-button" :class="{ 'is-active': showSettings }" title="设置" aria-label="设置"
              :aria-pressed="showSettings" :disabled="isBusy" @click="showSettings = !showSettings">
              <Icon name="settings" class="h-4 w-4" />
            </button>
            <button class="agent-icon-button" title="清空历史" aria-label="清空历史"
              :disabled="isBusy || !displayMessages.length" @click="handleClearHistory">
              <Icon name="clear" class="h-4 w-4" />
            </button>
            <button v-if="mode === 'float'" class="agent-icon-button" title="收纳到右侧槽" aria-label="收纳到右侧槽"
              @click="togglePanelDock('agent-chat')">
              <Icon name="arrow-up" class="h-4 w-4 rotate-90" />
            </button>
            <button v-if="mode === 'float'" class="agent-icon-button" title="折叠" aria-label="折叠"
              @click="toggleCollapse(hasMoved)">
              <Icon name="arrow-down" class="h-4 w-4" />
            </button>
          </nav>
        </header>

        <div v-if="error" role="alert" class="agent-error">{{ error }}</div>

        <div v-if="showSettings" class="agent-settings-area">
          <AgentSettings :config="config" @save="handleSaveConfig" @close="showSettings = false" />
        </div>
        <template v-else>
          <div v-if="shouldCompress && isReady" class="agent-history-notice">
            <span>上下文 {{ historyCount }} / {{ maxHistory }}</span>
            <button :disabled="isBusy" @click="handleCompressHistory">{{ isCompressing ? '压缩中...' : '压缩历史' }}</button>
          </div>
          <div ref="messagesContainerRef" class="agent-messages" role="log" aria-label="对话消息">
            <div v-if="!displayMessages.length" class="agent-empty">
              <Icon name="agent" class="h-8 w-8" aria-hidden="true" />
              <h3>{{ isReady ? '新对话' : '连接你的模型' }}</h3>
              <template v-if="!isReady">
                <p>配置支持工具调用的模型后开始对话。</p>
                <button class="agent-primary-button" @click="showSettings = true">
                  <Icon name="settings" class="h-3.5 w-3.5" />配置 API
                </button>
              </template>
            </div>
            <AgentMessage v-for="(msg, index) in displayMessages" :key="index" :role="msg.role" :content="msg.content"
              :tool-calls="msg.toolCalls"
              :is-loading="msg.isStreaming && !msg.content && !msg.toolCalls.length && !pendingQuestion" />
            <div v-if="activeTool && !pendingQuestion" class="agent-working" role="status">
              <span class="loading loading-spinner loading-xs"></span>{{ activeTool }}
            </div>
          </div>
          <div v-if="pendingQuestion" class="agent-question-area">
            <AgentQuestion :question="pendingQuestion" @answer="answerQuestion" @cancel="cancel" />
          </div>
          <footer v-else class="agent-composer-area">
            <div class="agent-composer" :class="{ 'agent-composer--disabled': !isReady }">
              <textarea v-model="inputMessage" :placeholder="isReady ? '输入指令...' : '请先配置 API'" aria-label="消息" rows="2"
                :disabled="isBusy || !isReady" @keydown="handleKeydown"></textarea>
              <div class="agent-composer-bottom">
                <span class="composer-model">{{ isReady ? providerName : '未配置 API' }}</span>
                <button v-if="!isBusy" class="agent-send" title="发送" aria-label="发送"
                  :disabled="!isReady || !inputMessage.trim()" @click="handleSend">
                  <Icon name="arrow-up" class="h-4 w-4" />
                </button>
                <button v-else class="agent-send agent-send--stop" title="停止请求" aria-label="停止请求" @click="cancel">
                  <Icon name="error" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </footer>
        </template>
      </section>
    </component>
  </Transition>
  <button v-if="isCollapsed && mode === 'float'" class="agent-collapsed" :style="{
    left: `clamp(8px, ${position.x}px, calc(100vw - 120px))`, top: `clamp(8px, ${position.y}px, calc(100dvh - 48px))`,
  }" @mousedown="startDrag" @click="toggleCollapse(hasMoved)">
    <Icon name="agent" class="h-4 w-4" />AI 助手
  </button>
</template>

<style scoped>
.agent-floating {
  position: fixed;
  z-index: 20;
  width: min(25rem, calc(100vw - 1rem));
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-base-content) 13%, var(--color-base-100));
  border-radius: 8px;
  box-shadow: 0 16px 56px -16px #00000030, 0 2px 8px #00000008;
}

.agent-shell {
  --agent-accent: light-dark(#087b6b, #65d9c0);
  --agent-muted: color-mix(in oklab, var(--color-base-content) 48%, transparent);
  display: flex;
  flex-direction: column;
  height: min(42rem, calc(100dvh - 6rem));
  min-height: 0;
  color: var(--color-base-content);
  background: var(--color-base-100);
  font-size: 13px;
  letter-spacing: 0;
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 8px;
  padding: 14px 12px 14px 16px;
  border-bottom: 1px solid var(--color-base-200);
  background: color-mix(in oklab, var(--color-base-200) 36%, var(--color-base-100));
}

.agent-header--draggable {
  cursor: move;
  user-select: none;
}

.agent-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.agent-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  color: var(--agent-accent);
  background: color-mix(in oklab, var(--agent-accent) 9%, var(--color-base-100));
  border-radius: 8px;
}

.agent-header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.5;
}

.agent-model {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  color: var(--agent-muted);
  font-size: 10px;
  min-width: 0;
}

.agent-model>span:last-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-warning);
}

.connection-dot--ready {
  background: var(--agent-accent);
}

.agent-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 1px;
}

.agent-icon-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 30px;
  border: 0;
  border-radius: 5px;
  color: var(--agent-muted);
  background: transparent;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.agent-icon-button:hover,
.agent-icon-button.is-active {
  color: var(--agent-accent);
  background: color-mix(in oklab, var(--agent-accent) 8%, transparent);
}

.agent-icon-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.agent-icon-button:focus-visible,
.agent-send:focus-visible,
.agent-primary-button:focus-visible {
  outline: 2px solid var(--agent-accent);
  outline-offset: 3px;
}

.agent-settings-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.agent-messages {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 20px;
  gap: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-base-300) transparent;
}

.agent-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 24px 0;
  margin-block: auto;
  color: var(--agent-muted);
}

.agent-empty> :first-child {
  color: var(--agent-accent);
}

.agent-empty h3 {
  margin: 0;
  color: var(--color-base-content);
  font-size: 19px;
  font-weight: 600;
}

.agent-empty p {
  max-width: 260px;
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
}

.agent-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 0;
  background: var(--agent-accent);
  color: var(--color-base-100);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.agent-error {
  flex-shrink: 0;
  max-height: 100px;
  overflow-y: auto;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in oklab, var(--color-error) 18%, transparent);
  color: var(--color-error);
  background: color-mix(in oklab, var(--color-error) 5%, var(--color-base-100));
  font-size: 11px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.agent-history-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--color-base-200);
  color: var(--agent-muted);
  font-size: 11px;
}

.agent-history-notice button {
  color: var(--agent-accent);
  background: none;
  border: 0;
  cursor: pointer;
}

.agent-working {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--agent-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}

.agent-question-area {
  flex-shrink: 0;
  max-height: 60%;
  overflow-y: auto;
  border-top: 1px solid var(--color-base-200);
  padding: 16px 20px;
  background: color-mix(in oklab, var(--color-base-200) 24%, var(--color-base-100));
}

.agent-composer-area {
  flex-shrink: 0;
  padding: 0 14px 14px;
}

.agent-composer {
  border: 1px solid color-mix(in oklab, var(--color-base-content) 15%, var(--color-base-100));
  border-radius: 8px;
  background: var(--color-base-100);
  box-shadow: 0 2px 4px #00000003;
  transition: border-color 150ms, box-shadow 150ms;
}

.agent-composer:focus-within {
  border-color: var(--agent-accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--agent-accent) 10%, transparent);
}

.agent-composer--disabled {
  background: color-mix(in oklab, var(--color-base-200) 30%, var(--color-base-100));
}

.agent-composer textarea {
  display: block;
  width: 100%;
  min-height: 66px;
  max-height: 140px;
  padding: 13px 13px 4px;
  resize: vertical;
  outline: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.6;
}

.agent-composer textarea::placeholder {
  color: var(--agent-muted);
}

.agent-composer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px 8px 13px;
}

.composer-model {
  color: var(--agent-muted);
  font-size: 10px;
}

.agent-send {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: var(--agent-accent);
  color: var(--color-base-100);
  cursor: pointer;
}

.agent-send:disabled {
  color: var(--agent-muted);
  background: var(--color-base-200);
  cursor: not-allowed;
}

.agent-send--stop {
  background: var(--color-base-200);
  color: var(--color-error);
}

.agent-collapsed {
  position: fixed;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-base-300);
  border-radius: 6px;
  background: var(--color-base-100);
  color: var(--color-base-content);
  box-shadow: 0 4px 16px #00000010;
  cursor: move;
  font-size: 12px;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(6px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {

  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: none;
  }
}
</style>
