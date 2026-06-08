<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Editor } from "../editor";
import type { MenuGroupContribution } from "../editor/api/menu";

const props = defineProps<{
  editor: Editor | undefined;
}>();

const emit = defineEmits<{
  action: [action: string];
}>();

const visible = ref(false);
const position = ref({ x: 0, y: 0 });
const groups = ref<MenuGroupContribution[]>([]);

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  if (!props.editor?.app) return;

  groups.value = props.editor.menus.getContextMenuGroups();
  if (groups.value.length === 0) return;

  position.value = { x: e.clientX, y: e.clientY };
  visible.value = true;
}

function handleClickOutside() {
  visible.value = false;
}

function handleAction(action: string) {
  visible.value = false;
  emit("action", action);
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
      <template v-for="(group, groupIndex) in groups" :key="group.id">
        <div v-if="groupIndex > 0" class="divider my-0.5"></div>
        <button
          v-for="item in group.items"
          :key="item.id"
          class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
          :class="{ 'text-error': item.danger }"
          @click="handleAction(item.command)"
        >
          <span class="opacity-60 text-xs w-16">{{ item.shortcut }}</span>
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
