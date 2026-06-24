<script setup lang="ts">
defineProps<{
  x: number;
  y: number;
  width: number;
  height: number;
  lockAspectRatio: boolean;
  showPosition: boolean;
  showSize: boolean;
}>();

const emit = defineEmits<{
  updateX: [value: number];
  updateY: [value: number];
  updateWidth: [value: number];
  updateHeight: [value: number];
  updateLockAspectRatio: [value: boolean];
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

  <div v-if="showSize">
    <div class="flex items-center justify-between px-1 mb-1">
      <span class="text-xs opacity-60">尺寸</span>
      <button
        class="btn btn-xs btn-ghost"
        :class="lockAspectRatio ? 'btn-active text-primary' : ''"
        @click="emit('updateLockAspectRatio', !lockAspectRatio)"
        :title="lockAspectRatio ? '解锁宽高比' : '锁定宽高比'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="lockAspectRatio" d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v2H10V6a2 2 0 0 1 2-2z" />
          <path v-else d="M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4zM6 10h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8z" />
        </svg>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2">
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
  </div>
</template>
