<script setup lang="ts">
import type { ToolCallResult } from "./agent-service";

interface Props {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallResult[];
  isLoading?: boolean;
}

const props = defineProps<Props>();

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
    paste: "粘贴",
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
    set_style: "修改样式",
    zoom_fit: "适应画布",
    zoom_in: "放大",
    zoom_out: "缩小",
    zoom_reset: "重置缩放",
    clear_canvas: "清空画布",
    get_canvas_info: "获取画布信息",
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
      class="chat-bubble text-xs"
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

        <!-- 普通文本 -->
        <div v-else class="whitespace-pre-wrap">{{ content }}</div>
      </template>
    </div>
  </div>
</template>
