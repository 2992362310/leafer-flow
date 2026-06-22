<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { IUI } from "leafer";
import type { Editor } from "@/editor";
import type { MenuGroupContribution } from "@/editor/api/menu";

const props = defineProps<{
  editor: Editor | undefined;
}>();

const emit = defineEmits<{
  action: [action: string];
}>();

const visible = ref(false);
const position = ref({ x: 0, y: 0 });
const cursorPos = ref({ x: 0, y: 0 });
const groups = ref<MenuGroupContribution[]>([]);
const lockedElementName = ref<string | null>(null);

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  if (!props.editor?.app) return;

  cursorPos.value = { x: e.clientX, y: e.clientY };

  // 检测右键位置是否有锁定元素
  const locked = findLockedAtPoint(e.clientX, e.clientY);
  lockedElementName.value = locked ? getElementLabel(locked) : null;

  groups.value = props.editor.menus.getContextMenuGroups();
  if (groups.value.length === 0 && !lockedElementName.value) return;

  position.value = { x: e.clientX, y: e.clientY };
  visible.value = true;
}

function findLockedAtPoint(screenX: number, screenY: number): IUI | null {
  if (!props.editor?.app) return null;
  const tree = props.editor.app.tree;
  const children = tree.children as IUI[];

  function search(items: IUI[]): IUI | null {
    for (const item of items) {
      const childChildren = (item as unknown as { children?: IUI[] }).children;
      if (childChildren?.length) {
        const found = search(childChildren as IUI[]);
        if (found) return found;
      }
      if (!item.locked) continue;
      try {
        const bounds = item.getBounds("box", "world");
        if (
          screenX >= bounds.x &&
          screenX <= bounds.x + bounds.width &&
          screenY >= bounds.y &&
          screenY <= bounds.y + bounds.height
        ) {
          return item;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  return search(children);
}

function getElementLabel(el: IUI): string {
  if (el.name) return el.name;
  const text = (el as unknown as { text?: string }).text;
  if (text) return String(text).slice(0, 20);
  return el.tag || "元素";
}

function handleClickOutside() {
  visible.value = false;
}

function handleAction(action: string) {
  visible.value = false;
  emit("action", action);
}

function handleUnlockAtCursor() {
  if (!lockedElementName.value) return;
  const action = `unlockAtCursor:${cursorPos.value.x},${cursorPos.value.y}`;
  handleAction(action);
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
      class="fixed z-50 bg-base-100 rounded-lg shadow-xl border border-base-200 py-1 min-w-45"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    >
      <!-- 锁定元素解锁选项 -->
      <div v-if="lockedElementName" class="px-1">
        <button
          class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2 text-warning"
          @click="handleUnlockAtCursor"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" />
          </svg>
          解锁「{{ lockedElementName }}」
        </button>
        <div v-if="groups.length > 0" class="divider my-0.5"></div>
      </div>

      <!-- 常规菜单项 -->
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
