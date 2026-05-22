<script setup lang="ts">
import { computed, ref } from "vue";
import type { ShapeLibraryItem } from "../editor/shape-library";
import { shapeLibraryGroups } from "../editor/shape-library";
import Icon from "./Icon.vue";

defineEmits<{
  tool: [tool: string];
}>();

const query = ref("");
const collapsed = ref(false);

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return shapeLibraryGroups;

  return shapeLibraryGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const haystack = [item.label, item.tool, ...item.keywords].join(" ").toLowerCase();
        return haystack.includes(keyword);
      }),
    }))
    .filter((group) => group.items.length > 0);
});

function handleDragStart(evt: DragEvent, item: ShapeLibraryItem) {
  if (!evt.dataTransfer) return;
  evt.dataTransfer.effectAllowed = "copy";
  evt.dataTransfer.setData("application/x-leafer-flow-shape", JSON.stringify(item));
  evt.dataTransfer.setData("text/plain", item.tool);
}
</script>

<template>
  <aside
    class="fixed left-3 top-24 bottom-24 z-20 w-64 rounded-lg border border-base-200 bg-base-100/95 shadow-xl backdrop-blur overflow-hidden"
  >
    <div class="flex items-center justify-between border-b border-base-200 px-3 py-2">
      <div class="text-sm font-semibold">图形库</div>
      <button class="btn btn-xs btn-ghost" @click="collapsed = !collapsed" :title="collapsed ? '展开图形库' : '折叠图形库'">
        {{ collapsed ? "∨" : "∧" }}
      </button>
    </div>

    <div v-show="!collapsed" class="flex h-[calc(100%-2.5rem)] flex-col">
      <div class="p-2">
        <input
          v-model="query"
          class="input input-bordered input-xs w-full"
          type="search"
          placeholder="搜索图形、BPMN、架构..."
        />
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-3">
        <section v-for="group in filteredGroups" :key="group.id" class="mb-3">
          <div class="sticky top-0 z-10 bg-base-100/95 py-1 text-[11px] font-semibold text-base-content/60">
            {{ group.title }}
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="item in group.items"
              :key="item.tool"
              draggable="true"
              class="btn btn-ghost h-16 flex-col gap-1 px-1 text-xs"
              :title="`${item.label}：拖拽到画布或点击选择工具`"
              @click="$emit('tool', item.tool)"
              @dragstart="handleDragStart($event, item)"
            >
              <Icon :name="item.icon" class="h-5 w-5" />
              <span class="max-w-full truncate">{{ item.label }}</span>
            </button>
          </div>
        </section>

        <div v-if="filteredGroups.length === 0" class="py-8 text-center text-xs text-base-content/50">
          未找到匹配图形
        </div>
      </div>
    </div>
  </aside>
</template>
