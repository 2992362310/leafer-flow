<script setup lang="ts">
import Icon from "./Icon.vue";
import { ACTION_NAME } from "../editor/constants";

defineProps<{
  zoomPercent: number;
}>();

const emits = defineEmits<{
  action: [action: string];
}>();

function handleClick(action: string) {
  emits("action", action);
}
</script>

<template>
  <div class="join bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-lg">
    <div class="tooltip tooltip-top" data-tip="缩小">
      <button @click="handleClick(ACTION_NAME.ZOOM_OUT)" class="btn btn-sm join-item">
        <span class="text-lg leading-none">-</span>
      </button>
    </div>

    <div class="tooltip tooltip-top" data-tip="恢复 100%">
      <button
        @click="handleClick(ACTION_NAME.ZOOM_RESET)"
        class="btn btn-sm join-item min-w-16 text-xs tabular-nums"
      >
        {{ zoomPercent }}%
      </button>
    </div>

    <div class="tooltip tooltip-top" data-tip="放大">
      <button @click="handleClick(ACTION_NAME.ZOOM_IN)" class="btn btn-sm join-item">
        <span class="text-lg leading-none">+</span>
      </button>
    </div>

    <div class="tooltip tooltip-top" data-tip="适应内容">
      <button @click="handleClick(ACTION_NAME.VIEW_FIT)" class="btn btn-sm join-item">
        <Icon name="select" class="h-4 w-4" />
      </button>
    </div>

    <div class="tooltip tooltip-top" data-tip="居中内容">
      <button @click="handleClick(ACTION_NAME.VIEW_CENTER)" class="btn btn-sm join-item">
        <Icon name="align_center" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
