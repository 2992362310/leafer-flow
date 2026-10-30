<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from "vue";
import type { MediaState } from "@leafer-flow/core";
import type Editor from "@leafer-flow/core/editor";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";

const props = defineProps<{ editor: Editor; context: PropertyPanelContext }>();
const selected = computed(() => {
  if (!props.context.selectedElement || props.context.isMultiSelection) return undefined;
  const id = props.editor.renderer.getId(props.context.selectedElement);
  const node = props.editor.document.getNode(id);
  return node?.type === "Video" || node?.type === "Audio" ? node : undefined;
});
const state = shallowRef<MediaState>({ paused: true, currentTime: 0, duration: 0, error: "" });
const error = ref("");
const refresh = () => {
  if (selected.value) state.value = props.editor.media.getState(selected.value.id);
};
const release = props.editor.media.subscribe(refresh);
watch(
  selected,
  () => {
    error.value = "";
    refresh();
  },
  { immediate: true },
);
onUnmounted(release);
const poster = computed(() => {
  const value = selected.value?.data.poster;
  const id =
    value && typeof value === "object" && !Array.isArray(value) ? value.assetId : undefined;
  return typeof id === "string" ? props.editor.resources.resolve(id) : undefined;
});
async function toggle() {
  if (!selected.value) return;
  try {
    await props.editor.media.toggle(selected.value.id);
    error.value = "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "无法播放";
  }
}
function update(key: "volume" | "muted" | "loop", value: number | boolean) {
  if (selected.value) props.editor.documentCommands.updateNode(selected.value.id, { [key]: value });
}
function seek(event: Event) {
  if (selected.value)
    props.editor.media.seek(selected.value.id, Number((event.target as HTMLInputElement).value));
}
function time(value: number) {
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
</script>

<template>
  <div v-if="selected" class="space-y-2">
    <img
      v-if="poster"
      :src="poster"
      alt="视频封面"
      class="w-full max-h-32 object-contain rounded"
    />
    <div class="flex items-center gap-2">
      <button
        class="btn btn-outline btn-xs btn-square shrink-0"
        type="button"
        :title="state.paused ? '播放' : '暂停'"
        :aria-label="state.paused ? '播放' : '暂停'"
        @click="toggle"
      >
        <Icon :name="state.paused ? 'play' : 'pause'" class="h-4 w-4" />
      </button>
      <output class="text-xs tabular-nums"
        >{{ time(state.currentTime) }} / {{ time(state.duration) }}</output
      >
    </div>
    <input
      class="range range-xs w-full"
      type="range"
      aria-label="播放进度"
      min="0"
      :max="state.duration || 1"
      step="0.1"
      :value="state.currentTime"
      :disabled="!state.duration"
      @change="seek"
    />
    <p v-if="error || state.error" role="alert" class="text-xs text-error break-words">
      {{ error || state.error }}
    </p>
    <label class="form-control w-full">
      <span class="label-text text-xs">音量</span>
      <input
        class="range range-xs w-full"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="Number(selected.data.volume ?? 1)"
        @change="update('volume', Number(($event.target as HTMLInputElement).value))"
      />
    </label>
    <label class="label cursor-pointer justify-start gap-2 px-1">
      <input
        class="toggle toggle-xs"
        type="checkbox"
        :checked="Boolean(selected.data.muted)"
        @change="update('muted', ($event.target as HTMLInputElement).checked)"
      />
      <span class="label-text text-xs">静音</span>
    </label>
    <label class="label cursor-pointer justify-start gap-2 px-1">
      <input
        class="toggle toggle-xs"
        type="checkbox"
        :checked="Boolean(selected.data.loop)"
        @change="update('loop', ($event.target as HTMLInputElement).checked)"
      />
      <span class="label-text text-xs">循环播放</span>
    </label>
  </div>
</template>
