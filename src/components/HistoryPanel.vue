<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import type { Editor } from "@/editor";
import type { HistoryEntry } from "@/editor/core/history";

const props = defineProps<{
  editor: Editor;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const entries = ref<HistoryEntry[]>([]);
const currentIndex = ref(0);

function refresh() {
  const history = props.editor.history;
  entries.value = history.getEntries();
  currentIndex.value = history.undoCount - 1;
}

// 定时刷新历史列表
let timer: ReturnType<typeof setInterval> | null = null;

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      refresh();
      timer = setInterval(refresh, 1000);
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  },
);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function jumpTo(index: number) {
  const history = props.editor.history;
  if (history.jumpTo(index)) {
    refresh();
    // 触发画布更新
    props.editor.app.emit("render");
  }
}
</script>

<template>
  <div
    v-if="open"
    class="absolute bottom-12 left-1/2 z-50 -translate-x-1/2 w-72 max-h-80"
  >
    <div class="bg-base-100 shadow-xl border border-base-200 rounded-lg overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-base-200">
        <span class="text-xs font-medium">撤销历史</span>
        <button class="btn btn-xs btn-ghost" @click="emit('close')">✕</button>
      </div>

      <div class="overflow-y-auto max-h-60 p-1 space-y-0.5">
        <div
          v-for="entry in entries"
          :key="entry.index"
          class="flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-base-200"
          :class="{
            'bg-primary/10 font-medium': entry.index === currentIndex,
            'opacity-50': entry.index > currentIndex,
          }"
          @click="jumpTo(entry.index)"
        >
          <span class="w-5 text-right text-[10px] opacity-60">{{ entry.index + 1 }}</span>
          <span class="flex-1 truncate">{{ entry.label }}</span>
          <span
            v-if="entry.index === currentIndex"
            class="badge badge-xs badge-primary"
          >当前</span>
          <span
            v-else-if="entry.index > currentIndex"
            class="badge badge-xs badge-ghost"
          >重做</span>
        </div>

        <div v-if="entries.length === 0" class="text-xs opacity-50 text-center py-4">
          暂无历史记录
        </div>
      </div>
    </div>
  </div>
</template>
