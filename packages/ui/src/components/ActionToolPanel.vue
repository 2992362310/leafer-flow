<script setup lang="ts">
import type { IconName } from "../assets/icons";
import type { Editor } from "@leafer-flow/core";
import type { DockPanelId } from "../composables/usePanelDock";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import type { ActionToolPanelSection } from "../builtin/action-tool-panels";

const props = withDefaults(
  defineProps<{
    open: boolean;
    editor?: Editor;
    panelId: DockPanelId;
    title: string;
    icon: IconName;
    layout?: "list" | "grid";
    sections: ActionToolPanelSection[];
    width?: number;
  }>(),
  {
    layout: "list",
    width: 288,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const { togglePanelDock } = usePanelDock();
const mode = usePanelMode(props.panelId);

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - props.width - 24, 24),
  initialY: 120,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: props.width,
  panelHeight: 420,
  margin: 8,
});

async function runCommand(command: string) {
  if (!props.editor) return;
  await props.editor.commands.execute(command);
}
</script>

<template>
  <div
    v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20"
    :class="width >= 320 ? 'w-80' : 'w-72'"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Icon :name="icon" class="h-4 w-4 shrink-0" />
        <span class="text-xs font-bold truncate">{{ title }}</span>
      </div>
      <div class="flex gap-1 shrink-0">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock(panelId)"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="关闭"
          @click.stop="emit('close')"
          @mousedown.stop
        >
          ✕
        </button>
      </div>
    </div>

    <div class="p-3 max-h-[min(70vh,28rem)] overflow-y-auto space-y-3">
      <section v-for="(section, index) in sections" :key="`${section.title ?? 's'}-${index}`">
        <div
          v-if="section.title"
          class="mb-1.5 text-[11px] font-semibold tracking-wide text-base-content/55"
        >
          {{ section.title }}
        </div>

        <div v-if="layout === 'grid'" class="grid grid-cols-3 gap-1.5">
          <button
            v-for="item in section.items"
            :key="item.id"
            class="btn btn-sm h-auto min-h-12 flex-col gap-1 px-1 py-1.5 font-normal"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : 'btn-ghost bg-base-200/45 hover:bg-base-200'
            "
            @click="runCommand(item.command)"
          >
            <Icon :name="item.icon ?? icon" class="h-4 w-4 shrink-0" />
            <span class="text-[10px] leading-tight text-center whitespace-normal">
              {{ item.label }}
            </span>
          </button>
        </div>

        <div v-else class="flex flex-col gap-1.5">
          <button
            v-for="item in section.items"
            :key="item.id"
            class="btn btn-sm h-9 justify-start gap-2 px-2.5 font-normal"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : 'btn-ghost bg-base-200/45 hover:bg-base-200'
            "
            @click="runCommand(item.command)"
          >
            <Icon :name="item.icon ?? icon" class="h-4 w-4 shrink-0" />
            <span class="text-xs truncate">{{ item.label }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>

  <PanelFlyoutWrapper
    v-else-if="mode === 'flyout'"
    :panel-id="panelId"
    :title="title"
    :icon="icon"
    :width="width"
  >
    <div class="p-3 space-y-3">
      <section v-for="(section, index) in sections" :key="`flyout-${section.title ?? 's'}-${index}`">
        <div
          v-if="section.title"
          class="mb-1.5 text-[11px] font-semibold tracking-wide text-base-content/55"
        >
          {{ section.title }}
        </div>

        <div v-if="layout === 'grid'" class="grid grid-cols-3 gap-1.5">
          <button
            v-for="item in section.items"
            :key="item.id"
            class="btn btn-sm h-auto min-h-12 flex-col gap-1 px-1 py-1.5 font-normal"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : 'btn-ghost bg-base-200/45 hover:bg-base-200'
            "
            @click="runCommand(item.command)"
          >
            <Icon :name="item.icon ?? icon" class="h-4 w-4 shrink-0" />
            <span class="text-[10px] leading-tight text-center whitespace-normal">
              {{ item.label }}
            </span>
          </button>
        </div>

        <div v-else class="flex flex-col gap-1.5">
          <button
            v-for="item in section.items"
            :key="item.id"
            class="btn btn-sm h-9 justify-start gap-2 px-2.5 font-normal"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : 'btn-ghost bg-base-200/45 hover:bg-base-200'
            "
            @click="runCommand(item.command)"
          >
            <Icon :name="item.icon ?? icon" class="h-4 w-4 shrink-0" />
            <span class="text-xs truncate">{{ item.label }}</span>
          </button>
        </div>
      </section>
    </div>
  </PanelFlyoutWrapper>
</template>
