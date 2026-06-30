<script setup lang="ts">
import { ref } from "vue";
import type { DockPanelId } from "@/composables/usePanelDock";
import { usePanelDock } from "@/composables/usePanelDock";

const { dockedPanels, undockPanel, moveDockedPanel } = usePanelDock();

const dragSourceId = ref<DockPanelId | null>(null);
const dragTargetId = ref<DockPanelId | null>(null);

function handleDragStart(id: DockPanelId, evt: DragEvent) {
    dragSourceId.value = id;
    if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", id);
    }
}

function handleDragOver(id: DockPanelId, evt: DragEvent) {
    evt.preventDefault();
    dragTargetId.value = id;
}

function handleDrop(id: DockPanelId, evt: DragEvent) {
    evt.preventDefault();
    if (!dragSourceId.value) return;
    moveDockedPanel(dragSourceId.value, id);
    dragSourceId.value = null;
    dragTargetId.value = null;
}

function handleDragEnd() {
    dragSourceId.value = null;
    dragTargetId.value = null;
}
</script>

<template>
    <aside
        v-if="dockedPanels.length > 0"
        class="fixed right-2 top-1/2 z-40 -translate-y-1/2 rounded-xl border border-base-200 bg-base-100/85 p-1 shadow-lg backdrop-blur-sm"
    >
        <div class="mb-1 px-1 text-center text-[10px] text-base-content/45">面板</div>
        <div class="flex flex-col items-center gap-1">
            <button
                v-for="panel in dockedPanels"
                :key="panel.id"
                class="btn btn-ghost btn-sm btn-square group"
                :class="[
                    dragSourceId === panel.id ? 'opacity-40' : '',
                    dragTargetId === panel.id ? 'ring-1 ring-primary/50 bg-primary/10' : '',
                ]"
                :title="`展开${panel.label}`"
                draggable="true"
                @dragstart="handleDragStart(panel.id, $event)"
                @dragover="handleDragOver(panel.id, $event)"
                @drop="handleDrop(panel.id, $event)"
                @dragend="handleDragEnd"
                @click="undockPanel(panel.id)"
            >
                <Icon :name="panel.icon" class="h-4 w-4" />
                <span
                    class="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded border border-base-200 bg-base-100 px-2 py-1 text-[10px] text-base-content opacity-0 shadow transition-opacity group-hover:opacity-100"
                >
                    {{ panel.label }}
                </span>
            </button>
        </div>
    </aside>
</template>
