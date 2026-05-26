<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Editor } from "../editor";
import { doCopy, doDelete, doGroup, doPaste, doUnGroup, doConnectorToFront } from "../editor";

const props = defineProps<{
  editor: Editor | undefined;
}>();

const emit = defineEmits(["action"]);

const visible = ref(false);
const position = ref({ x: 0, y: 0 });
const hasSelection = ref(false);
const hasGroup = ref(false);

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  if (!props.editor?.app) return;

  position.value = { x: e.clientX, y: e.clientY };
  visible.value = true;

  const list = props.editor.app.editor.list;
  hasSelection.value = Boolean(list && list.length > 0);
  hasGroup.value = Boolean(
    list && list.some((el) => "children" in el && (el as { children?: unknown }).children),
  );
}

function handleClickOutside() {
  visible.value = false;
}

function handleAction(action: string) {
  visible.value = false;
  if (!props.editor) return;

  if (action === "delete") {
    const result = doDelete(props.editor);
    emit("action", { action: "delete", result });
  } else if (action === "copy") {
    const result = doCopy(props.editor);
    emit("action", { action: "copy", result });
  } else if (action === "paste") {
    const result = doPaste(props.editor);
    emit("action", { action: "paste", result });
  } else if (action === "group") {
    const result = doGroup(props.editor);
    emit("action", { action: "group", result });
  } else if (action === "ungroup") {
    const result = doUnGroup(props.editor);
    emit("action", { action: "ungroup", result });
  } else if (action === "connectorsToFront") {
    const result = doConnectorToFront(props.editor);
    emit("action", { action: "connectorsToFront", result });
  } else {
    emit("action", { action });
  }
}

onMounted(() => {
  document.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("contextmenu", handleContextMenu);
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-50 bg-base-100 rounded-lg shadow-xl border border-base-200 py-1 min-w-[180px]"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    >
      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
        :class="{ 'opacity-40 cursor-not-allowed': !hasSelection }"
        :disabled="!hasSelection"
        @click="handleAction('copy')"
      >
        <span class="opacity-60 text-xs w-16">Ctrl+C</span>
        <span>复制</span>
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
        @click="handleAction('paste')"
      >
        <span class="opacity-60 text-xs w-16">Ctrl+V</span>
        <span>粘贴</span>
      </button>

      <div class="divider my-0.5"></div>

      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
        :class="{ 'opacity-40 cursor-not-allowed': !hasSelection }"
        :disabled="!hasSelection"
        @click="handleAction('group')"
      >
        <span class="opacity-60 text-xs w-16">Ctrl+G</span>
        <span>编组</span>
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
        :class="{ 'opacity-40 cursor-not-allowed': !hasGroup }"
        :disabled="!hasGroup"
        @click="handleAction('ungroup')"
      >
        <span class="opacity-60 text-xs w-16">Ctrl+Shift+G</span>
        <span>取消编组</span>
      </button>

      <div class="divider my-0.5"></div>

      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
        @click="handleAction('connectorsToFront')"
      >
        <span class="opacity-60 text-xs w-16"></span>
        <span>连接线置顶</span>
      </button>

      <button
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 text-error flex items-center gap-2"
        :class="{ 'opacity-40 cursor-not-allowed': !hasSelection }"
        :disabled="!hasSelection"
        @click="handleAction('delete')"
      >
        <span class="opacity-60 text-xs w-16">Del</span>
        <span>删除</span>
      </button>
    </div>
  </Teleport>
</template>
