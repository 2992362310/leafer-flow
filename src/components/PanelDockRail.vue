<script setup lang="ts">
import { ref } from "vue";
import type { DockPanelId } from "@/composables/usePanelDock";
import { usePanelDock } from "@/composables/usePanelDock";

const { dockedPanels, activeFlyoutId, isFlyoutOpen, toggleFlyout, moveDockedPanel } = usePanelDock();

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
    <!-- 点击遮罩关闭 flyout -->
    <div v-if="activeFlyoutId" class="fixed inset-0 z-30" @click="toggleFlyout(activeFlyoutId!)" />

    <aside v-if="dockedPanels.length > 0"
        class="fixed right-2 top-16 z-40 rounded-xl border border-base-200 bg-base-100/85 p-1 shadow-lg backdrop-blur-sm">
        <div class="mb-1 px-1 text-center text-[10px] text-base-content/45">面板</div>
        <div class="flex flex-col items-center gap-1">
            <button v-for="panel in dockedPanels" :key="panel.id" class="btn btn-sm btn-square transition-colors"
                :class="[
                    isFlyoutOpen(panel.id)
                        ? 'btn-primary'
                        : 'btn-ghost',
                    dragSourceId === panel.id ? 'opacity-40' : '',
                    dragTargetId === panel.id ? 'ring-1 ring-primary/50 bg-primary/10' : '',
                ]" :title="isFlyoutOpen(panel.id) ? `收起${panel.label}` : `展开${panel.label}`" draggable="true"
                @dragstart="handleDragStart(panel.id, $event)" @dragover="handleDragOver(panel.id, $event)"
                @drop="handleDrop(panel.id, $event)" @dragend="handleDragEnd" @click.stop="toggleFlyout(panel.id)">
                <Icon :name="panel.icon" class="h-4 w-4" />
            </button>
        </div>
    </aside>
</template>
