<script setup lang="ts">
import type { ShapeLibraryItem } from "@/editor/shape-library";

const props = withDefaults(
  defineProps<{
    item: ShapeLibraryItem;
    active?: boolean;
    compact?: boolean;
  }>(),
  {
    active: false,
    compact: false,
  },
);

const emit = defineEmits<{
  select: [item: ShapeLibraryItem];
  dragStart: [evt: DragEvent, item: ShapeLibraryItem];
}>();

const buttonClass = () => [
  "btn",
  props.compact ? "btn-xs h-8 w-8 p-0" : "h-16 flex-col gap-1 px-1 text-xs",
  props.active ? "btn-primary" : "btn-ghost",
];
</script>

<template>
  <button
    draggable="true"
    :class="buttonClass()"
    :title="`${item.label}：拖拽到画布或点击选择工具`"
    @click="emit('select', item)"
    @dragstart="emit('dragStart', $event, item)"
  >
    <Icon :name="item.icon" :class="compact ? 'h-4 w-4' : 'h-5 w-5'" />
    <span v-if="!compact" class="max-w-full truncate">{{ item.label }}</span>
  </button>
</template>
