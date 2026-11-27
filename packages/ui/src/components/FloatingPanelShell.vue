<script setup lang="ts">
import type { IconName } from "../assets/icons";

const props = withDefaults(
    defineProps<{
        title: string;
        icon: IconName;
        position: { x: number; y: number };
        width: number;
        maxHeight?: string;
        zIndex?: number;
    }>(),
    {
        maxHeight: "calc(100vh - 2rem)",
        zIndex: 20,
    },
);

const emit = defineEmits<{
    dragStart: [event: MouseEvent];
}>();
</script>

<template>
    <section
        class="card fixed z-20 flex flex-col overflow-hidden border border-base-200 bg-base-100/90 shadow-xl backdrop-blur-sm"
        :style="{
            left: `${props.position.x}px`,
            top: `${props.position.y}px`,
            width: `min(${props.width}px, calc(100vw - 2rem))`,
            maxHeight: props.maxHeight,
            zIndex: props.zIndex,
        }" @pointerdown.stop @click.stop>
        <header
            class="flex shrink-0 cursor-move select-none items-center justify-between border-b border-base-200 bg-base-200/50 p-2"
            @mousedown="emit('dragStart', $event)">
            <div class="flex min-w-0 items-center gap-2">
                <Icon :name="props.icon" class="h-4 w-4 shrink-0" />
                <span class="truncate text-xs font-bold">{{ props.title }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-1" @mousedown.stop>
                <slot name="actions" />
            </div>
        </header>
        <slot />
    </section>
</template>
