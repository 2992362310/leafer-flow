<script setup lang="ts">
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
} from "../editor/core/drawing-settings";
import type { ActionButtonGroupContribution } from "../editor/api/action-button";
import Icon from "./Icon.vue";

const props = defineProps<{
  groups: ActionButtonGroupContribution[];
}>();

const emits = defineEmits<{
  action: [action: string];
}>();

const connectorRouteOptions = [
  { value: "orthogonal", label: "直角线" },
  { value: "bezier", label: "曲线" },
  { value: "straight", label: "直线" },
] as const;

const snapOptions = [
  { value: true, label: "开启吸附" },
  { value: false, label: "关闭吸附" },
] as const;

function handleRouteChange(value: string) {
  setConnectorRouteType(value as "orthogonal" | "bezier" | "straight");
}

function handleSmoothnessChange(value: number) {
  setFreehandSmoothness(value);
}

function handleSnapChange(value: boolean) {
  setSnapEnabled(value);
}

function handleClick(action: string) {
  emits("action", action);
}
</script>

<template>
  <div class="join">
    <template v-for="group in props.groups" :key="group.id">
      <template v-if="(group.kind ?? 'button') === 'button'">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="tooltip tooltip-bottom"
          :data-tip="item.label"
        >
          <button
            @click="handleClick(item.command)"
            class="btn btn-sm join-item h-9 w-9 px-0"
            :class="
              item.danger
                ? 'btn-error bg-red-50 hover:bg-red-100 border-none text-red-500'
                : undefined
            "
          >
            <Icon :name="item.icon ?? group.icon" class="h-5 w-5" />
          </button>
        </div>
      </template>

      <div v-else-if="group.kind === 'dropdown'" class="dropdown dropdown-bottom">
        <div class="tooltip tooltip-bottom" :data-tip="group.label">
          <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
            <Icon :name="group.icon" class="h-5 w-5" />
          </button>
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-100 rounded-box z-20 w-44 p-2 shadow border border-base-200"
        >
          <li v-for="item in group.items" :key="item.id">
            <button @click="handleClick(item.command)" class="text-xs">
              <Icon :name="item.icon ?? group.icon" class="h-4 w-4" />
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>
    </template>

    <div class="dropdown dropdown-bottom dropdown-end">
      <div class="tooltip tooltip-bottom" data-tip="绘制设置">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="template" class="h-5 w-5" />
        </button>
      </div>
      <div
        tabindex="0"
        class="dropdown-content bg-base-100 rounded-box z-20 w-56 p-3 shadow border border-base-200"
      >
        <div class="mb-3">
          <div class="text-xs font-medium mb-2">连线样式</div>
          <div class="join w-full">
            <button
              v-for="item in connectorRouteOptions"
              :key="item.value"
              class="btn btn-xs join-item flex-1"
              :class="{ 'btn-primary': getConnectorRouteType() === item.value }"
              @click="handleRouteChange(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="mb-3">
          <div class="flex items-center justify-between text-xs font-medium mb-2">
            <span>自由绘制平滑度</span>
            <span class="tabular-nums">{{ getFreehandSmoothness().toFixed(1) }}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            :value="getFreehandSmoothness()"
            @input="(e) => handleSmoothnessChange(Number((e.target as HTMLInputElement).value))"
            class="range range-xs"
          />
        </div>
        <div>
          <div class="text-xs font-medium mb-2">吸附</div>
          <div class="join w-full">
            <button
              v-for="item in snapOptions"
              :key="String(item.value)"
              class="btn btn-xs join-item flex-1"
              :class="{ 'btn-primary': getSnapEnabled() === item.value }"
              @click="handleSnapChange(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
