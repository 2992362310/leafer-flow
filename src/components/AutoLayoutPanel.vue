<script setup lang="ts">
import { ref } from "vue";
import type { Editor } from "@/editor";
import { useDraggable } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";

type LayoutScope = "selection" | "global";
type LayoutDirection = "auto" | "TB" | "LR" | "BT" | "RL";

const props = defineProps<{
  open: boolean;
  editor?: Editor;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("auto-layout-panel");

const scope = ref<LayoutScope>("selection");
const direction = ref<LayoutDirection>("auto");
const notice = ref("");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - 320, 24),
  initialY: 140,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 288,
  panelHeight: 280,
  margin: 8,
});

const scopeOptions: { value: LayoutScope; label: string }[] = [
  { value: "selection", label: "选区" },
  { value: "global", label: "全图" },
];

const directionOptions: { value: LayoutDirection; label: string }[] = [
  { value: "auto", label: "智能" },
  { value: "TB", label: "↓ 上下" },
  { value: "LR", label: "→ 左右" },
  { value: "BT", label: "↑ 下上" },
  { value: "RL", label: "← 右左" },
];

function commandFor(nextScope: LayoutScope, nextDirection: LayoutDirection) {
  if (nextScope === "selection") {
    if (nextDirection === "auto") return "autoLayoutSelection";
    return `autoLayoutSelection${nextDirection}`;
  }
  if (nextDirection === "auto") return "autoLayoutGlobal";
  return `autoLayoutGlobal${nextDirection}`;
}

async function apply(nextDirection: LayoutDirection) {
  direction.value = nextDirection;
  if (!props.editor) {
    notice.value = "编辑器未就绪";
    return;
  }
  const result = await props.editor.commands.execute(commandFor(scope.value, nextDirection));
  notice.value = result?.message || (result?.success ? "布局完成" : "布局失败");
}
</script>

<template>
  <div
    v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-72"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <Icon name="distribute_vertical" class="h-4 w-4" />
        <span class="text-xs font-bold">智能布局</span>
      </div>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('auto-layout-panel')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="emit('close')" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div class="p-3 space-y-4">
      <div>
        <div class="text-xs font-medium mb-2">范围</div>
        <div class="join w-full">
          <button
            v-for="option in scopeOptions"
            :key="option.value"
            class="btn btn-sm join-item flex-1"
            :class="{ 'btn-primary': scope === option.value }"
            @click="scope = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="text-xs font-medium mb-2">方向（点选即应用）</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in directionOptions"
            :key="option.value"
            class="btn btn-sm"
            :class="direction === option.value ? 'btn-primary' : 'btn-ghost bg-base-200/45'"
            @click="apply(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div v-if="notice" class="text-[11px] text-base-content/60">{{ notice }}</div>
    </div>
  </div>

  <PanelFlyoutWrapper
    v-else-if="mode === 'flyout'"
    panel-id="auto-layout-panel"
    title="智能布局"
    icon="distribute_vertical"
    :width="288"
  >
    <div class="p-3 space-y-4">
      <div>
        <div class="text-xs font-medium mb-2">范围</div>
        <div class="join w-full">
          <button
            v-for="option in scopeOptions"
            :key="option.value"
            class="btn btn-sm join-item flex-1"
            :class="{ 'btn-primary': scope === option.value }"
            @click="scope = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="text-xs font-medium mb-2">方向（点选即应用）</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in directionOptions"
            :key="option.value"
            class="btn btn-sm"
            :class="direction === option.value ? 'btn-primary' : 'btn-ghost bg-base-200/45'"
            @click="apply(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div v-if="notice" class="text-[11px] text-base-content/60">{{ notice }}</div>
    </div>
  </PanelFlyoutWrapper>
</template>
