<script setup lang="ts">
import type { ShapeLibraryItem } from "@leafer-flow/core/shape-library";

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

function handlePointerDown(evt: PointerEvent) {
  if (evt.button !== 0) return;
  emit("select", props.item);
}

function handleClick(evt: MouseEvent) {
  if (evt.detail === 0) emit("select", props.item);
}
</script>

<template>
  <button :draggable="!compact" :class="buttonClass()" :title="`${item.label}：拖拽到画布或点击选择工具`"
    @pointerdown="handlePointerDown" @click="handleClick" @dragstart="emit('dragStart', $event, item)">
    <Icon :name="item.icon" :class="compact ? 'h-4 w-4' : 'h-5 w-5'" />
    <span v-if="!compact" class="max-w-full truncate">{{ item.label }}</span>
  </button>
</template>
