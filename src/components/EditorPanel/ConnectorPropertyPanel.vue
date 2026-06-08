<script setup lang="ts">
import type { ConnectorRouteType, ConnectorSide } from "leafer-connector";

defineProps<{
  routeType: ConnectorRouteType;
  arrowMode: "none" | "end" | "both";
  lineDashed: boolean;
  lineCornerRadius: number;
  fromSide: ConnectorSide | "auto";
  toSide: ConnectorSide | "auto";
  connectorDescription: string;
  showDescription: boolean;
}>();

const emit = defineEmits<{
  updateRouteType: [value: ConnectorRouteType];
  updateArrowMode: [value: "none" | "end" | "both"];
  updateLineDashed: [value: boolean];
  updateLineCornerRadius: [value: number];
  updateConnectorSide: [which: "from" | "to", value: ConnectorSide | "auto"];
  updateConnectorDescription: [value: string];
}>();
</script>

<template>
  <label class="form-control w-full">
    <div class="label p-1"><span class="label-text text-xs">路径</span></div>
    <select
      class="select select-bordered select-xs w-full"
      :value="routeType"
      @change="emit('updateRouteType', ($event.target as HTMLSelectElement).value as ConnectorRouteType)"
    >
      <option value="orthogonal">折线</option>
      <option value="bezier">贝塞尔</option>
      <option value="straight">直线</option>
    </select>
  </label>

  <label class="form-control w-full">
    <div class="label p-1"><span class="label-text text-xs">箭头</span></div>
    <select
      class="select select-bordered select-xs w-full"
      :value="arrowMode"
      @change="emit('updateArrowMode', ($event.target as HTMLSelectElement).value as 'none' | 'end' | 'both')"
    >
      <option value="none">无箭头</option>
      <option value="end">终点箭头</option>
      <option value="both">双向箭头</option>
    </select>
  </label>

  <label class="label cursor-pointer justify-start gap-2 px-1">
    <input
      type="checkbox"
      class="toggle toggle-xs"
      :checked="lineDashed"
      @change="emit('updateLineDashed', ($event.target as HTMLInputElement).checked)"
    />
    <span class="label-text text-xs">虚线</span>
  </label>

  <label class="form-control w-full">
    <div class="label p-1">
      <span class="label-text text-xs">圆角</span>
      <span class="label-text-alt text-xs">{{ lineCornerRadius }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="40"
      step="1"
      :value="lineCornerRadius"
      @input="emit('updateLineCornerRadius', Number(($event.target as HTMLInputElement).value))"
      class="range range-xs"
    />
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">起点锚点</span></div>
      <select
        class="select select-bordered select-xs w-full"
        :value="fromSide"
        @change="emit('updateConnectorSide', 'from', ($event.target as HTMLSelectElement).value as ConnectorSide | 'auto')"
      >
        <option value="auto">自动</option>
        <option value="top">上</option>
        <option value="right">右</option>
        <option value="bottom">下</option>
        <option value="left">左</option>
      </select>
    </label>
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">终点锚点</span></div>
      <select
        class="select select-bordered select-xs w-full"
        :value="toSide"
        @change="emit('updateConnectorSide', 'to', ($event.target as HTMLSelectElement).value as ConnectorSide | 'auto')"
      >
        <option value="auto">自动</option>
        <option value="top">上</option>
        <option value="right">右</option>
        <option value="bottom">下</option>
        <option value="left">左</option>
      </select>
    </label>
  </div>

  <label v-if="showDescription" class="form-control w-full">
    <div class="label p-1"><span class="label-text text-xs">描述</span></div>
    <textarea
      :value="connectorDescription"
      @input="emit('updateConnectorDescription', ($event.target as HTMLTextAreaElement).value)"
      class="textarea textarea-bordered textarea-xs w-full min-h-14 resize-y"
      placeholder="可选的自定义描述..."
    ></textarea>
  </label>
</template>
