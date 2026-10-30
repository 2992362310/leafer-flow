<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { ToolCallResult } from "./agent-service";
import type { UserAnswer } from "./agent-question";

interface Props {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
  isLoading?: boolean;
}

const props = defineProps<Props>();

const renderedContent = computed(() =>
  DOMPurify.sanitize(marked.parse(props.content, { async: false, breaks: true, gfm: true }), {
    USE_PROFILES: { html: true },
  }),
);

function resultText(call: ToolCallResult): string {
  if (call.name !== "ask_user" || !call.success) return call.result;
  try {
    const answer = JSON.parse(call.result) as UserAnswer;
    return [...answer.selected, answer.text].filter(Boolean).join("；");
  } catch {
    return call.result;
  }
}
</script>

<template>
  <div class="chat" :class="role === 'user' ? 'chat-end' : 'chat-start'">
    <div class="chat-header text-[10px] opacity-50">
      {{ role === "user" ? "你" : "模型回复" }}
    </div>
    <div class="chat-bubble text-xs max-w-[90%] min-w-0 break-words" :class="{
      'chat-bubble-primary': role === 'user',
      'chat-bubble-neutral': role === 'assistant',
    }">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex items-center gap-2">
        <span class="loading loading-dots loading-xs"></span>
        <span>思考中...</span>
      </div>

      <!-- 消息内容 -->
      <template v-else>
        <!-- 工具调用结果 -->
        <div v-if="toolCalls && toolCalls.length > 0" class="space-y-2">
          <div class="text-[11px] font-semibold">编辑器执行结果</div>
          <div v-for="(call, index) in toolCalls" :key="index" class="rounded p-2 border"
            :class="call.success ? 'bg-base-200/50 border-base-300' : 'bg-error/15 border-error/50 text-error'"
            :role="call.success ? 'status' : 'alert'">
            <div class="flex items-center gap-1 text-[11px] font-medium mb-1">
              <Icon :name="call.success ? 'success' : 'error'" class="h-3 w-3 shrink-0" aria-hidden="true" />
              {{ call.success ? (call.name === 'ask_user' ? '已回答' : '成功') : '失败' }} · {{ call.name }}
            </div>
            <div class="text-[11px]" :class="{ 'opacity-70': call.success }">{{ resultText(call) }}</div>
          </div>
        </div>

        <!-- Markdown 内容 -->
        <div v-if="content" class="markdown-body" :class="{ 'mt-2': toolCalls?.length }" v-html="renderedContent"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.25em;
}

.markdown-body :deep(h1) {
  font-size: 1.1em;
}

.markdown-body :deep(h2) {
  font-size: 1.05em;
}

.markdown-body :deep(h3) {
  font-size: 1em;
}

.markdown-body :deep(p) {
  margin-bottom: 0.5em;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-body :deep(li) {
  margin-bottom: 0.15em;
}

.markdown-body :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: monospace;
}

.markdown-body :deep(pre) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 0.5em;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.2);
  padding-left: 0.5em;
  margin-left: 0;
  margin-bottom: 0.5em;
  opacity: 0.8;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin-bottom: 0.5em;
  font-size: 0.85em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 0.3em 0.5em;
}

.markdown-body :deep(th) {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0.5em 0;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

.markdown-body :deep(em) {
  font-style: italic;
}
</style>
