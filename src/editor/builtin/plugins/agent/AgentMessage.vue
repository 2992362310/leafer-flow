<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import type { ToolCallResult } from "./agent-service";

interface Props {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallResult[];
  isLoading?: boolean;
}

const props = defineProps<Props>();

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!props.content) return "";
  try {
    return marked.parse(props.content);
  } catch {
    return props.content;
  }
});

function formatToolName(name: string): string {
  const nameMap: Record<string, string> = {
    save_file: "保存文件",
    load_file: "加载文件",
    export_png: "导出 PNG",
    export_svg: "导出 SVG",
    undo: "撤销",
    redo: "重做",
    delete: "删除",
    copy: "复制",
    cut: "剪切",
    paste: "粘贴",
    duplicate: "原位复制",
    select_all: "全选",
    align: "对齐",
    distribute: "分布",
    group: "编组",
    ungroup: "取消编组",
    bring_forward: "上移一层",
    send_backward: "下移一层",
    bring_to_front: "置于顶层",
    send_to_back: "置于底层",
    create_shape: "创建图形",
    insert_template: "插入模板",
    set_style: "修改属性",
    modify_text: "修改文字",
    zoom_fit: "适应画布",
    zoom_in: "放大",
    zoom_out: "缩小",
    zoom_reset: "重置缩放",
    clear_canvas: "清空画布",
    get_canvas_info: "获取画布信息",
    get_selection_info: "获取选中信息",
    search_elements: "搜索元素",
    connect_elements: "连接元素",
  };
  return nameMap[name] || name;
}
</script>

<template>
  <div class="chat" :class="role === 'user' ? 'chat-end' : 'chat-start'">
    <div class="chat-header text-[10px] opacity-50">
      {{ role === "user" ? "你" : "AI 助手" }}
    </div>
    <div
      class="chat-bubble text-xs max-w-[90%]"
      :class="{
        'chat-bubble-primary': role === 'user',
        'chat-bubble-neutral': role === 'assistant',
      }"
    >
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex items-center gap-2">
        <span class="loading loading-dots loading-xs"></span>
        <span>思考中...</span>
      </div>

      <!-- 消息内容 -->
      <template v-else>
        <!-- 工具调用结果 -->
        <div v-if="toolCalls && toolCalls.length > 0" class="space-y-2">
          <div
            v-for="(call, index) in toolCalls"
            :key="index"
            class="bg-base-200/50 rounded p-2"
          >
            <div class="flex items-center gap-1 text-[11px] font-medium mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              {{ formatToolName(call.name) }}
            </div>
            <div class="text-[11px] opacity-70">{{ call.result }}</div>
          </div>
        </div>

        <!-- Markdown 内容 -->
        <div v-else class="markdown-body" v-html="renderedContent"></div>
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
