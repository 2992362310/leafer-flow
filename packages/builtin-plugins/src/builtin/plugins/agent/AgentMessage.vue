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
  <article v-if="content || toolCalls?.length || isLoading" class="agent-message" :class="`agent-message--${role}`">
    <div class="message-author">
      <Icon v-if="role === 'assistant'" name="agent" class="h-3.5 w-3.5" aria-hidden="true" />
      <span>{{ role === "user" ? "你" : "AI 助手" }}</span>
    </div>
    <div v-if="isLoading" class="message-thinking" role="status">
      <span class="loading loading-dots loading-xs"></span>
      <span>思考中</span>
    </div>
    <template v-else>
      <div v-if="toolCalls?.length" class="tool-records" aria-label="编辑器执行结果">
        <details v-for="(call, index) in toolCalls" :key="index" class="tool-record"
          :class="{ 'tool-record--failed': !call.success }" :open="!call.success">
          <summary>
            <Icon :name="call.success ? 'success' : 'error'" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span class="tool-name">{{ call.name }}</span>
            <span class="tool-status">{{ call.success ? (call.name === 'ask_user' ? '已回答' : '已完成') : '执行失败' }}</span>
            <Icon name="arrow-down" class="tool-chevron h-3 w-3 shrink-0" aria-hidden="true" />
          </summary>
          <div class="tool-result" :role="call.success ? 'status' : 'alert'">{{ resultText(call) }}</div>
        </details>
      </div>
      <div v-if="content" class="markdown-body" v-html="renderedContent"></div>
    </template>
  </article>
</template>

<style scoped>
.agent-message {
  min-width: 0;
  color: var(--color-base-content);
  font-size: 13px;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.message-author {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: color-mix(in oklab, var(--color-base-content) 52%, transparent);
  font-size: 11px;
  font-weight: 600;
}

.agent-message--assistant .message-author :first-child {
  color: var(--agent-accent, #087b6b);
}

.agent-message--user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.agent-message--user .markdown-body {
  max-width: 90%;
  padding: 10px 13px;
  border: 1px solid color-mix(in oklab, var(--agent-accent, #087b6b) 14%, var(--color-base-200));
  border-radius: 8px 8px 2px 8px;
  background: color-mix(in oklab, var(--agent-accent, #087b6b) 7%, var(--color-base-100));
}

.message-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in oklab, var(--color-base-content) 55%, transparent);
  font-size: 12px;
}

.tool-records {
  margin-bottom: 12px;
  border-block: 1px solid var(--color-base-200);
}

.tool-record+.tool-record {
  border-top: 1px solid var(--color-base-200);
}

.tool-record summary {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 35px;
  padding: 5px 2px;
  list-style: none;
  cursor: pointer;
  color: var(--agent-accent, #087b6b);
}

.tool-record summary::-webkit-details-marker {
  display: none;
}

.tool-name {
  flex: 1;
  min-width: 0;
  color: color-mix(in oklab, var(--color-base-content) 72%, transparent);
  font-family: ui-monospace, monospace;
  font-size: 11px;
}

.tool-status {
  flex-shrink: 0;
  font-size: 10px;
}

.tool-chevron {
  transition: transform 150ms ease;
}

.tool-record[open] .tool-chevron {
  transform: rotate(180deg);
}

.tool-result {
  padding: 0 2px 10px 23px;
  color: color-mix(in oklab, var(--color-base-content) 65%, transparent);
  font-size: 11px;
  white-space: pre-wrap;
}

.tool-record--failed summary,
.tool-record--failed .tool-result {
  color: var(--color-error);
}

.markdown-body {
  min-width: 0;
  max-width: 100%;
}

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

.markdown-body :deep(ul) {
  list-style: disc;
}

.markdown-body :deep(ol) {
  list-style: decimal;
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
  background: var(--color-base-200);
  padding: 12px;
  border-radius: 4px;
  max-width: 100%;
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
  display: block;
  max-width: 100%;
  overflow-x: auto;
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
