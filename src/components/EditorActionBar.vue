<script setup lang="ts">
import { onMounted, watch } from "vue";
import EditorButton from "@/components/EditorButton.vue";
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";
import { useCollapsible, useDraggable } from "@/composables/useDraggable";

const ACTION_BAR_POSITION_KEY = "leafer-flow-action-bar-position";

defineProps<{
  actionButtonGroups: ActionButtonGroupContribution[];
}>();

const emit = defineEmits<{
  action: [action: string];
}>();

const { position, isDragging, startDrag } = useDraggable({
  initialX: 430,
  initialY: 88,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);

onMounted(() => {
  try {
    const raw = localStorage.getItem(ACTION_BAR_POSITION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof saved.x === "number" && typeof saved.y === "number") {
      position.value = { x: saved.x, y: saved.y };
    }
  } catch (error) {
    console.warn("读取操作工具条位置失败", error);
  }
});

watch(position, (next) => {
  try {
    localStorage.setItem(ACTION_BAR_POSITION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("保存操作工具条位置失败", error);
  }
}, { deep: true });
</script>

<template>
  <div
    class="fixed z-20 border border-base-200 bg-base-100/90 shadow-lg backdrop-blur rounded-xl overflow-hidden"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <div class="flex items-center justify-between gap-2 border-b border-base-200 px-2 py-1.5 cursor-move select-none" @mousedown="startDrag">
      <span class="text-xs font-semibold text-base-content/70">操作工具</span>
      <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse(isDragging)">
        {{ isCollapsed ? "∨" : "∧" }}
      </button>
    </div>
    <div v-show="!isCollapsed" class="px-2 py-1.5 w-max flex gap-1">
      <EditorButton :groups="actionButtonGroups" @action="emit('action', $event)" />
    </div>
  </div>
</template>
