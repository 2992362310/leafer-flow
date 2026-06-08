<script setup lang="ts">
defineProps<{
  x: number;
  y: number;
  width: number;
  height: number;
  showPosition: boolean;
  showSize: boolean;
}>();

const emit = defineEmits<{
  updateX: [value: number];
  updateY: [value: number];
  updateWidth: [value: number];
  updateHeight: [value: number];
}>();
</script>

<template>
  <div v-if="showPosition" class="grid grid-cols-2 gap-2">
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">X</span></div>
      <input
        type="number"
        :value="x"
        @input="emit('updateX', Number(($event.target as HTMLInputElement).value))"
        class="input input-bordered input-xs w-full"
      />
    </label>
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">Y</span></div>
      <input
        type="number"
        :value="y"
        @input="emit('updateY', Number(($event.target as HTMLInputElement).value))"
        class="input input-bordered input-xs w-full"
      />
    </label>
  </div>

  <div v-if="showSize" class="grid grid-cols-2 gap-2">
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">宽</span></div>
      <input
        type="number"
        min="1"
        :value="width"
        @input="emit('updateWidth', Number(($event.target as HTMLInputElement).value))"
        class="input input-bordered input-xs w-full"
      />
    </label>
    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">高</span></div>
      <input
        type="number"
        min="1"
        :value="height"
        @input="emit('updateHeight', Number(($event.target as HTMLInputElement).value))"
        class="input input-bordered input-xs w-full"
      />
    </label>
  </div>
</template>
