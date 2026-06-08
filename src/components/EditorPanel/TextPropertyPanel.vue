<script setup lang="ts">
defineProps<{
  textContent: string;
  fontSize: number;
  textColor: string;
  showContent: boolean;
  showConnectorLabelPresets: boolean;
}>();

const emit = defineEmits<{
  updateText: [value: string];
  updateFontSize: [value: number];
  updateTextColor: [value: string];
  applyTextPreset: [value: string];
}>();
</script>

<template>
  <label v-if="showContent" class="form-control w-full">
    <div class="label p-1"><span class="label-text text-xs">内容</span></div>
    <textarea
      :value="textContent"
      @input="emit('updateText', ($event.target as HTMLTextAreaElement).value)"
      class="textarea textarea-bordered textarea-xs w-full min-h-16 resize-y"
    ></textarea>
  </label>

  <div v-if="showConnectorLabelPresets" class="grid grid-cols-4 gap-1">
    <button class="btn btn-xs" @click="emit('applyTextPreset', '是')">是</button>
    <button class="btn btn-xs" @click="emit('applyTextPreset', '否')">否</button>
    <button class="btn btn-xs" @click="emit('applyTextPreset', '通过')">通过</button>
    <button class="btn btn-xs" @click="emit('applyTextPreset', '驳回')">驳回</button>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <label class="form-control">
      <div class="label p-1"><span class="label-text text-xs">文字色</span></div>
      <input
        type="color"
        :value="textColor"
        @input="emit('updateTextColor', ($event.target as HTMLInputElement).value)"
        class="h-7 w-full cursor-pointer rounded border border-base-300"
      />
    </label>
    <label class="form-control">
      <div class="label p-1">
        <span class="label-text text-xs">字号</span>
        <span class="label-text-alt text-xs">{{ fontSize }}</span>
      </div>
      <input
        type="range"
        min="8"
        max="72"
        step="1"
        :value="fontSize"
        @input="emit('updateFontSize', Number(($event.target as HTMLInputElement).value))"
        class="range range-xs mt-2"
      />
    </label>
  </div>
</template>
