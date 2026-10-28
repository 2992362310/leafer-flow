<script setup lang="ts">
import { ref, watch } from "vue";
import { Video } from "leafer";
import type Editor from "@leafer-flow/core/editor";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";

const props = defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
}>();

const isPlaying = ref(false);

function selectedVideo() {
  const element = props.context.selectedElement;
  if (!element || props.context.isMultiSelection) return undefined;
  const id = props.editor.renderer.getId(element);
  const node = props.editor.document.getNode(id);
  return node?.type === "Video" ? { id, node, element: element instanceof Video ? element : undefined } : undefined;
}

watch(() => props.context.selectedElement, () => { isPlaying.value = false; });

function togglePlayback() {
  const video = selectedVideo()?.element;
  if (!video) return;
  if (video.paused) {
    video.play();
    isPlaying.value = true;
  } else {
    video.pause();
    isPlaying.value = false;
  }
}

function updateSetting(key: "volume" | "muted" | "loop", value: number | boolean) {
  const video = selectedVideo();
  if (!video) return;
  props.editor.documentCommands.updateNode(video.id, { [key]: value });
}
</script>

<template>
  <div v-if="selectedVideo()" class="space-y-2">
    <button class="btn btn-outline btn-xs w-full" type="button" @click="togglePlayback">
      {{ isPlaying ? "暂停视频" : "播放视频" }}
    </button>

    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">音量</span>
        <output>{{ Number(selectedVideo()?.node.data.volume ?? 1).toFixed(2) }}</output>
      </div>
      <input
        class="range range-xs w-full"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="Number(selectedVideo()?.node.data.volume ?? 1)"
        @change="updateSetting('volume', Number(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="label cursor-pointer justify-start gap-2 px-1">
      <input
        class="toggle toggle-xs"
        type="checkbox"
        :checked="Boolean(selectedVideo()?.node.data.muted ?? true)"
        @change="updateSetting('muted', ($event.target as HTMLInputElement).checked)"
      />
      <span class="label-text text-xs">静音</span>
    </label>

    <label class="label cursor-pointer justify-start gap-2 px-1">
      <input
        class="toggle toggle-xs"
        type="checkbox"
        :checked="Boolean(selectedVideo()?.node.data.loop ?? false)"
        @change="updateSetting('loop', ($event.target as HTMLInputElement).checked)"
      />
      <span class="label-text text-xs">循环播放</span>
    </label>
  </div>
</template>
