<script setup lang="ts">
import ShapeLibraryItem from "@/components/ShapeLibraryItem.vue";
import type { ShapeLibraryGroup, ShapeLibraryItem as ShapeLibraryItemData } from "@/editor/shape-library";

defineProps<{
  group: ShapeLibraryGroup;
  activeTool?: string;
}>();

const emit = defineEmits<{
  select: [item: ShapeLibraryItemData];
  dragStart: [evt: DragEvent, item: ShapeLibraryItemData];
}>();
</script>

<template>
  <section class="mb-3">
    <div class="sticky top-0 z-10 bg-base-100/95 py-1 text-[11px] font-semibold text-base-content/60">
      {{ group.title }}
    </div>
    <div class="grid grid-cols-2 gap-1.5">
      <ShapeLibraryItem
        v-for="item in group.items"
        :key="`${group.id}-${item.tool}`"
        :item="item"
        :active="activeTool === item.tool"
        @select="emit('select', $event)"
        @drag-start="emit('dragStart', $event, item)"
      />
    </div>
  </section>
</template>
