<script setup lang="ts">
import { computed, ref } from "vue";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
  type ConnectorRouteType,
} from "@leafer-flow/core/core/drawing-settings";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("drawing-settings");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - 340, 24),
  initialY: 120,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 288,
  panelHeight: 320,
  margin: 8,
});

/** Local ticks so UI re-renders after mutating module-level settings. */
const tick = ref(0);
function bump() {
  tick.value += 1;
}

const routeType = computed(() => {
  void tick.value;
  return getConnectorRouteType();
});
const smoothness = computed(() => {
  void tick.value;
  return getFreehandSmoothness();
});
const snapEnabled = computed(() => {
  void tick.value;
  return getSnapEnabled();
});

const routeOptions: { value: ConnectorRouteType; label: string }[] = [
  { value: "orthogonal", label: "直角线" },
  { value: "bezier", label: "曲线" },
  { value: "straight", label: "直线" },
];

function updateRouteType(value: ConnectorRouteType) {
  setConnectorRouteType(value);
  bump();
}

function updateSmoothness(value: number) {
  setFreehandSmoothness(value);
  bump();
}

function updateSnap(value: boolean) {
  setSnapEnabled(value);
  bump();
}
</script>

<template>
  <div v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-72"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }" @click.stop>
    <div class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag">
      <div class="flex items-center gap-2">
        <Icon name="template" class="h-4 w-4" />
        <span class="text-xs font-bold">绘图设置</span>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('drawing-settings')"
          @mousedown.stop>
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="emit('close')" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div class="p-3 space-y-4">
      <div>
        <div class="text-xs font-medium mb-2">连线样式</div>
        <div class="join w-full">
          <button v-for="option in routeOptions" :key="option.value" class="btn btn-xs join-item flex-1"
            :class="{ 'btn-primary': routeType === option.value }" @click="updateRouteType(option.value)">
            {{ option.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between text-xs font-medium mb-2">
          <span>自由绘制平滑度</span>
          <span class="tabular-nums">{{ smoothness.toFixed(1) }}</span>
        </div>
        <input type="range" min="0.5" max="4" step="0.5" :value="smoothness" class="range range-xs"
          @input="updateSmoothness(Number(($event.target as HTMLInputElement).value))" />
      </div>

      <div>
        <div class="text-xs font-medium mb-2">吸附</div>
        <div class="join w-full">
          <button class="btn btn-xs join-item flex-1" :class="{ 'btn-primary': snapEnabled }" @click="updateSnap(true)">
            开启吸附
          </button>
          <button class="btn btn-xs join-item flex-1" :class="{ 'btn-primary': !snapEnabled }"
            @click="updateSnap(false)">
            关闭吸附
          </button>
        </div>
      </div>
    </div>
  </div>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="drawing-settings" title="绘图设置" icon="template"
    :width="288">
    <div class="p-3 space-y-4">
      <div>
        <div class="text-xs font-medium mb-2">连线样式</div>
        <div class="join w-full">
          <button v-for="option in routeOptions" :key="option.value" class="btn btn-xs join-item flex-1"
            :class="{ 'btn-primary': routeType === option.value }" @click="updateRouteType(option.value)">
            {{ option.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between text-xs font-medium mb-2">
          <span>自由绘制平滑度</span>
          <span class="tabular-nums">{{ smoothness.toFixed(1) }}</span>
        </div>
        <input type="range" min="0.5" max="4" step="0.5" :value="smoothness" class="range range-xs"
          @input="updateSmoothness(Number(($event.target as HTMLInputElement).value))" />
      </div>

      <div>
        <div class="text-xs font-medium mb-2">吸附</div>
        <div class="join w-full">
          <button class="btn btn-xs join-item flex-1" :class="{ 'btn-primary': snapEnabled }" @click="updateSnap(true)">
            开启吸附
          </button>
          <button class="btn btn-xs join-item flex-1" :class="{ 'btn-primary': !snapEnabled }"
            @click="updateSnap(false)">
            关闭吸附
          </button>
        </div>
      </div>
    </div>
  </PanelFlyoutWrapper>
</template>
