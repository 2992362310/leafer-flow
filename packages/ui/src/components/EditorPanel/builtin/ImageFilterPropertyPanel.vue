<script setup lang="ts">
import type Editor from "@leafer-flow/core/editor";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";
import { IMAGE_FILTERS, normalizeImageFilterSettings, type ImageFilterType } from "@leafer-flow/core";

const props = defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
}>();

function selectedImage() {
  const element = props.context.selectedElement;
  if (!element || props.context.isMultiSelection) return undefined;
  const id = props.editor.renderer.getId(element);
  const node = props.editor.document.getNode(id);
  return node?.type === "Image" ? node : undefined;
}

function settings() {
  return normalizeImageFilterSettings(selectedImage()?.data.imageFilters);
}

function setFilter(type: ImageFilterType, value: number) {
  const node = selectedImage();
  if (!node) return;
  props.editor.documentCommands.updateNode(node.id, {
    imageFilters: { ...settings(), [type]: value },
  });
}

function resetFilters() {
  const node = selectedImage();
  if (!node) return;
  props.editor.documentCommands.updateNode(node.id, {
    imageFilters: { exposure: 0, contrast: 0, saturation: 0 },
  });
}
</script>

<template>
  <div class="space-y-2">
    <div v-for="filter in IMAGE_FILTERS" :key="filter.type" class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <label :for="`image-filter-${filter.type}`">{{ filter.label }}</label>
        <output>{{ settings()[filter.type].toFixed(2) }}</output>
      </div>
      <input
        :id="`image-filter-${filter.type}`"
        class="range range-xs w-full"
        type="range"
        :min="filter.min"
        :max="filter.max"
        :step="filter.step"
        :value="settings()[filter.type]"
        @change="setFilter(filter.type, Number(($event.target as HTMLInputElement).value))"
      />
    </div>
    <button class="btn btn-ghost btn-xs" type="button" @click="resetFilters">重置滤镜</button>
  </div>
</template>
