<script setup lang="ts">
defineProps<{
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  showColors: boolean;
}>();

const emit = defineEmits<{
  updateFill: [value: string];
  updateStroke: [value: string];
  updateStrokeWidth: [value: number];
  updateOpacity: [value: number];
  updateCornerRadius: [value: number];
}>();
</script>

<template>
  <div v-if="showColors" class="grid grid-cols-2 gap-2">
    <label class="form-control">
      <div class="label p-1"><span class="label-text text-xs">填充</span></div>
      <input
        type="color"
        :value="fill"
        @input="emit('updateFill', ($event.target as HTMLInputElement).value)"
        class="h-7 w-full cursor-pointer rounded border border-base-300"
      />
    </label>
    <label class="form-control">
      <div class="label p-1"><span class="label-text text-xs">边框</span></div>
      <input
        type="color"
        :value="stroke"
        @input="emit('updateStroke', ($event.target as HTMLInputElement).value)"
        class="h-7 w-full cursor-pointer rounded border border-base-300"
      />
    </label>
  </div>

  <label class="form-control w-full">
    <div class="label p-1">
      <span class="label-text text-xs">线宽</span>
      <span class="label-text-alt text-xs">{{ strokeWidth }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="20"
      step="1"
      :value="strokeWidth"
      @input="emit('updateStrokeWidth', Number(($event.target as HTMLInputElement).value))"
      class="range range-xs"
    />
  </label>

  <label class="form-control w-full">
    <div class="label p-1">
      <span class="label-text text-xs">圆角</span>
      <span class="label-text-alt text-xs">{{ cornerRadius }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="50"
      step="1"
      :value="cornerRadius"
      @input="emit('updateCornerRadius', Number(($event.target as HTMLInputElement).value))"
      class="range range-xs"
    />
  </label>

  <label class="form-control w-full">
    <div class="label p-1">
      <span class="label-text text-xs">透明度</span>
      <span class="label-text-alt text-xs">{{ opacity }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      :value="opacity"
      @input="emit('updateOpacity', Number(($event.target as HTMLInputElement).value))"
      class="range range-xs"
    />
  </label>
</template>
