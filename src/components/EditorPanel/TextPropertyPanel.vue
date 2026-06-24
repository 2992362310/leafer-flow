<script setup lang="ts">
defineProps<{
  textContent: string;
  fontSize: number;
  textColor: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  showContent: boolean;
  showConnectorLabelPresets: boolean;
}>();

const emit = defineEmits<{
  updateText: [value: string];
  updateFontSize: [value: number];
  updateTextColor: [value: string];
  updateFontWeight: [value: string];
  updateFontStyle: [value: string];
  updateTextAlign: [value: string];
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

  <!-- 文字样式：加粗/斜体/对齐 -->
  <div class="flex items-center gap-1">
    <button
      class="btn btn-xs flex-1"
      :class="fontWeight === 'bold' ? 'btn-active' : ''"
      @click="emit('updateFontWeight', fontWeight === 'bold' ? 'normal' : 'bold')"
    >
      <strong>B</strong>
    </button>
    <button
      class="btn btn-xs flex-1"
      :class="fontStyle === 'italic' ? 'btn-active' : ''"
      @click="emit('updateFontStyle', fontStyle === 'italic' ? 'normal' : 'italic')"
    >
      <em>I</em>
    </button>
    <div class="divider divider-horizontal mx-0"></div>
    <button
      class="btn btn-xs"
      :class="textAlign === 'left' ? 'btn-active' : ''"
      @click="emit('updateTextAlign', 'left')"
      title="左对齐"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
    </button>
    <button
      class="btn btn-xs"
      :class="textAlign === 'center' ? 'btn-active' : ''"
      @click="emit('updateTextAlign', 'center')"
      title="居中"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M8 12h8M6 18h12"/></svg>
    </button>
    <button
      class="btn btn-xs"
      :class="textAlign === 'right' ? 'btn-active' : ''"
      @click="emit('updateTextAlign', 'right')"
      title="右对齐"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M10 12h10M6 18h14"/></svg>
    </button>
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
