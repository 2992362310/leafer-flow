<script setup lang="ts">
import { onMounted } from "vue";
import EditorButton from "@/components/EditorButton.vue";
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";
import { useCollapsible, useDraggable } from "@/composables/useDraggable";
import { usePanelDock } from "@/composables/usePanelDock";

const ACTION_BAR_POSITION_KEY = "leafer-flow-action-bar-position";

const props = withDefaults(defineProps<{
    actionButtonGroups: ActionButtonGroupContribution[];
    showMarketButtons?: boolean;
}>(), {
    showMarketButtons: false,
});

const emit = defineEmits<{
    action: [action: string];
    openPluginMarket: [];
    openTemplateMarket: [];
}>();

const { position, isDragging, startDrag } = useDraggable({
    initialX: 430,
    initialY: 88,
    onDragEnd: savePosition,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
const { isPanelDocked, togglePanelDock } = usePanelDock();

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

function savePosition(next: { x: number; y: number }) {
    try {
        localStorage.setItem(ACTION_BAR_POSITION_KEY, JSON.stringify(next));
    } catch (error) {
        console.warn("保存操作工具条位置失败", error);
    }
}
</script>

<template>
    <div v-if="!isPanelDocked('action-bar')"
        class="fixed z-20 rounded-2xl border border-base-200/80 bg-base-100/95 shadow-xl backdrop-blur overflow-hidden"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }">
        <div class="flex items-center justify-between gap-2 border-b border-base-200/80 px-4 py-3 cursor-move select-none"
            @mousedown="startDrag">
            <div class="flex items-center gap-2.5">
                <span
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-base-200 text-base-content/80">
                    <Icon name="template" class="h-4 w-4" />
                </span>
                <div>
                    <div class="text-sm font-semibold leading-5">操作工具</div>
                    <div class="text-[11px] text-base-content/60">拖动面板或折叠，常用操作集中在这里</div>
                </div>
            </div>
            <div class="flex items-center gap-0.5">
                <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽"
                    @click.stop="togglePanelDock('action-bar')" @mousedown.stop>
                    <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
                </button>
                <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse(isDragging)" @mousedown.stop>
                    {{ isCollapsed ? "∨" : "∧" }}
                </button>
            </div>
        </div>

        <div v-show="!isCollapsed" class="p-3">
            <div v-if="props.showMarketButtons" class="mb-3 rounded-xl border border-base-200/80 bg-base-200/35 p-2.5">
                <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">市场入口</div>
                <div class="flex flex-wrap gap-2">
                    <button class="btn btn-sm h-9 min-w-20" @click="emit('openPluginMarket')">
                        <Icon name="agent" class="h-4 w-4" />
                        插件
                    </button>
                    <button class="btn btn-sm h-9 min-w-20" @click="emit('openTemplateMarket')">
                        <Icon name="template" class="h-4 w-4" />
                        模板
                    </button>
                </div>
            </div>

            <div class="rounded-xl border border-base-200/80 bg-base-100 p-2.5">
                <div class="mb-2 text-[11px] font-semibold tracking-wide text-base-content/55">常用操作</div>
                <EditorButton :groups="actionButtonGroups" :columns="8" @action="emit('action', $event)" />
            </div>
        </div>
    </div>
</template>
