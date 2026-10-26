<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import type { Editor } from "@leafer-flow/core";
import { useDraggable } from "../composables/useDraggable";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import { useInjectedPageCommands } from "../context";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import { getConnectorRouteType, type ConnectorRouteType } from "@leafer-flow/core/core/drawing-settings";

const props = defineProps<{
  open: boolean;
  editor?: Editor;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { activateTool, handleAction } = useInjectedPageCommands();
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("connector-panel");

const { position, startDrag } = useDraggable({
  initialX: Math.max(window.innerWidth - 360, 24),
  initialY: 120,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 320,
  panelHeight: 480,
  margin: 8,
});

const routeType = ref<ConnectorRouteType>(getConnectorRouteType());
const animationEnabled = ref(false);
const animationSpeed = ref(1);
const animationScope = ref<"all" | "selected">("all");
const animationDirection = ref<"forward" | "reverse">("forward");
const currentTool = ref<string>(TOOL_NAME.SELECT);

const isArrowToolActive = computed(() => {
  return currentTool.value === TOOL_NAME.DRAW_ARROW;
});

const routeOptions: Array<{ id: ConnectorRouteType; label: string }> = [
  { id: "orthogonal", label: "直角" },
  { id: "bezier", label: "曲线" },
  { id: "straight", label: "直线" },
];

function syncRouteType() {
  routeType.value = getConnectorRouteType();
}

function onRouteTypeChanged(event: Event) {
  const detail = (event as CustomEvent<{ type?: ConnectorRouteType }>).detail;
  if (!detail?.type) {
    syncRouteType();
    return;
  }
  routeType.value = detail.type;
}

function onAnimationChanged(event: Event) {
  const detail = (event as CustomEvent<{
    enabled?: boolean;
    speed?: number;
    scope?: "all" | "selected";
    direction?: "forward" | "reverse";
  }>).detail;
  animationEnabled.value = Boolean(detail?.enabled);
  if (typeof detail?.speed === "number") animationSpeed.value = detail.speed;
  if (detail?.scope === "selected" || detail?.scope === "all") animationScope.value = detail.scope;
  if (detail?.direction === "forward" || detail?.direction === "reverse") {
    animationDirection.value = detail.direction;
  }
}

function onToolChanged(event: Event) {
  const detail = (event as CustomEvent<{ tool?: string }>).detail;
  if (!detail?.tool) return;
  currentTool.value = detail.tool;
}

async function useArrowTool() {
  currentTool.value = TOOL_NAME.DRAW_ARROW;
  activateTool(TOOL_NAME.DRAW_ARROW);
}

async function setRoute(type: ConnectorRouteType) {
  if (type === "orthogonal") {
    await handleAction("connectorRouteOrthogonal");
  } else if (type === "bezier") {
    await handleAction("connectorRouteBezier");
  } else {
    await handleAction("connectorRouteStraight");
  }
  routeType.value = type;
}

async function selectAllConnectors() {
  await handleAction("selectAllConnectors");
}

async function selectSameType() {
  await handleAction("selectByType");
}

async function setAnimationScope(scope: "all" | "selected") {
  if (animationScope.value === scope) return;
  animationScope.value = scope;
  await props.editor?.commands.execute("setConnectorFlowAnimationScope", { scope });
}

async function setAnimationDirection(direction: "forward" | "reverse") {
  if (animationDirection.value === direction) return;
  animationDirection.value = direction;
  await props.editor?.commands.execute("setConnectorFlowAnimationDirection", { direction });
}

async function toggleAnimation() {
  await handleAction("toggleConnectorFlowAnimation");
}

async function setAnimationEnabled(enabled: boolean) {
  if (animationEnabled.value === enabled) return;
  await props.editor?.commands.execute("setConnectorFlowAnimationEnabled", { enabled });
}

async function setAnimationSpeed(nextSpeed: number) {
  const speed = Number(nextSpeed.toFixed(1));
  animationSpeed.value = speed;
  await props.editor?.commands.execute("setConnectorFlowAnimationSpeed", { speed });
}

async function run(command: string) {
  await handleAction(command);
}

onMounted(() => {
  currentTool.value = TOOL_NAME.SELECT;
  syncRouteType();
  window.addEventListener("leafer-flow:connector-route-type-changed", onRouteTypeChanged);
  window.addEventListener("leafer-flow:connector-flow-animation-changed", onAnimationChanged);
  window.addEventListener("leafer-flow:tool-changed", onToolChanged);
  window.dispatchEvent(new CustomEvent("leafer-flow:connector-flow-animation-probe"));
});

onUnmounted(() => {
  window.removeEventListener("leafer-flow:connector-route-type-changed", onRouteTypeChanged);
  window.removeEventListener("leafer-flow:connector-flow-animation-changed", onAnimationChanged);
  window.removeEventListener("leafer-flow:tool-changed", onToolChanged);
});
</script>

<template>
  <div
    v-if="open && mode === 'float'"
    class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden z-20 w-80"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <Icon name="draw_arrow" class="h-4 w-4" />
        <span class="text-xs font-bold">连线中心</span>
      </div>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="收纳到右侧槽"
          @click.stop="togglePanelDock('connector-panel')"
          @mousedown.stop
        >
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" title="关闭" @click.stop="emit('close')" @mousedown.stop>
          ✕
        </button>
      </div>
    </div>

    <div class="p-3 space-y-4 max-h-[min(72vh,32rem)] overflow-y-auto">
      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">工具</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="btn btn-sm justify-start"
            :class="isArrowToolActive ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="useArrowTool"
          >
            <Icon name="draw_arrow" class="h-4 w-4" />
            连线工具
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="selectAllConnectors">
            <Icon name="select" class="h-4 w-4" />
            全选连线
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start col-span-2" @click="selectSameType">
            <Icon name="select" class="h-4 w-4" />
            选中同类型（基于当前选中）
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">连线样式</div>
        <div class="join w-full">
          <button
            v-for="option in routeOptions"
            :key="option.id"
            class="btn btn-xs join-item flex-1"
            :class="routeType === option.id ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setRoute(option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3 space-y-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55">流动动画</div>
        <div class="join w-full">
          <button
            class="btn btn-xs join-item flex-1"
            :class="animationEnabled ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setAnimationEnabled(true)"
          >
            开启
          </button>
          <button
            class="btn btn-xs join-item flex-1"
            :class="!animationEnabled ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setAnimationEnabled(false)"
          >
            关闭
          </button>
        </div>

        <div>
          <div class="text-[11px] text-base-content/65 mb-1">作用范围</div>
          <div class="join w-full">
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationScope === 'all' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationScope('all')"
            >
              全局
            </button>
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationScope === 'selected' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationScope('selected')"
            >
              仅选中
            </button>
          </div>
        </div>

        <div>
          <div class="text-[11px] text-base-content/65 mb-1">流动方向</div>
          <div class="join w-full">
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationDirection === 'forward' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationDirection('forward')"
            >
              正向
            </button>
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationDirection === 'reverse' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationDirection('reverse')"
            >
              反向
            </button>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-[11px] text-base-content/65 mb-1">
            <span>速度</span>
            <span class="tabular-nums">{{ animationSpeed.toFixed(1) }}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="6"
            step="0.2"
            :value="animationSpeed"
            class="range range-xs"
            @input="setAnimationSpeed(Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <button class="btn btn-sm btn-ghost w-full" @click="toggleAnimation">
          <Icon name="draw_arrow" class="h-4 w-4" />
          快速切换动画
        </button>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">连线编辑</div>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('addConnectorLabel')">
            <Icon name="connector_label" class="h-4 w-4" /> 标签
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('addConnectorWaypoint')">
            <Icon name="draw_arrow" class="h-4 w-4" /> 中间点
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('removeConnectorWaypoints')">
            <Icon name="clear" class="h-4 w-4" /> 清中间点
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('connectorsToFront')">
            <Icon name="draw_arrow" class="h-4 w-4" /> 置顶
          </button>
        </div>
      </section>
    </div>
  </div>

  <PanelFlyoutWrapper v-else-if="mode === 'flyout'" panel-id="connector-panel" title="连线中心" icon="draw_arrow" :width="320">
    <div class="p-3 space-y-4">
      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">工具</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="btn btn-sm justify-start"
            :class="isArrowToolActive ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="useArrowTool"
          >
            <Icon name="draw_arrow" class="h-4 w-4" />
            连线工具
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="selectAllConnectors">
            <Icon name="select" class="h-4 w-4" />
            全选连线
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start col-span-2" @click="selectSameType">
            <Icon name="select" class="h-4 w-4" />
            选中同类型（基于当前选中）
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">连线样式</div>
        <div class="join w-full">
          <button
            v-for="option in routeOptions"
            :key="`flyout-${option.id}`"
            class="btn btn-xs join-item flex-1"
            :class="routeType === option.id ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setRoute(option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3 space-y-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55">流动动画</div>
        <div class="join w-full">
          <button
            class="btn btn-xs join-item flex-1"
            :class="animationEnabled ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setAnimationEnabled(true)"
          >
            开启
          </button>
          <button
            class="btn btn-xs join-item flex-1"
            :class="!animationEnabled ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
            @click="setAnimationEnabled(false)"
          >
            关闭
          </button>
        </div>

        <div>
          <div class="text-[11px] text-base-content/65 mb-1">作用范围</div>
          <div class="join w-full">
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationScope === 'all' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationScope('all')"
            >
              全局
            </button>
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationScope === 'selected' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationScope('selected')"
            >
              仅选中
            </button>
          </div>
        </div>

        <div>
          <div class="text-[11px] text-base-content/65 mb-1">流动方向</div>
          <div class="join w-full">
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationDirection === 'forward' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationDirection('forward')"
            >
              正向
            </button>
            <button
              class="btn btn-xs join-item flex-1"
              :class="animationDirection === 'reverse' ? 'btn-primary' : 'btn-ghost bg-base-200/45 hover:bg-base-200'"
              @click="setAnimationDirection('reverse')"
            >
              反向
            </button>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-[11px] text-base-content/65 mb-1">
            <span>速度</span>
            <span class="tabular-nums">{{ animationSpeed.toFixed(1) }}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="6"
            step="0.2"
            :value="animationSpeed"
            class="range range-xs"
            @input="setAnimationSpeed(Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </section>

      <section class="rounded-xl border border-base-200/80 bg-base-100 p-3">
        <div class="text-[11px] font-semibold tracking-wide text-base-content/55 mb-2">连线编辑</div>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('addConnectorLabel')">
            <Icon name="connector_label" class="h-4 w-4" /> 标签
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('addConnectorWaypoint')">
            <Icon name="draw_arrow" class="h-4 w-4" /> 中间点
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('removeConnectorWaypoints')">
            <Icon name="clear" class="h-4 w-4" /> 清中间点
          </button>
          <button class="btn btn-sm btn-ghost bg-base-200/45 hover:bg-base-200 justify-start" @click="run('connectorsToFront')">
            <Icon name="draw_arrow" class="h-4 w-4" /> 置顶
          </button>
        </div>
      </section>
    </div>
  </PanelFlyoutWrapper>
</template>
