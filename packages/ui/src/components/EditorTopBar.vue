<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import EditorToolbar from "./EditorToolbar.vue";
import type { Editor } from "@leafer-flow/core";
import { useInjectedPageCommands } from "../context";

const props = defineProps<{
  editor?: Editor;
  selectedTool?: string;
}>();

const { handleTool } = useInjectedPageCommands();
const registryRevision = ref(0);

function refreshRegistry() {
  registryRevision.value++;
}

onMounted(() => window.addEventListener("leafer-flow:plugin-market-changed", refreshRegistry));
onUnmounted(() => window.removeEventListener("leafer-flow:plugin-market-changed", refreshRegistry));

const toolbarGroups = computed(() => {
  void registryRevision.value;
  if (!props.editor) return [];
  return props.editor.toolRegistry.getToolbarGroups()
    .map((group) => ({
      ...group,
      items: group.items,
    }))
    .filter((group) => group.items.length > 0);
});
const selectedToolModel = defineModel<string>("selectedTool");
</script>

<template>
  <div
    class="absolute z-10 top-12! left-1/2! flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-1 overflow-visible rounded-xl border border-base-200 bg-base-100/90 px-2 py-1.5 shadow-lg backdrop-blur">
    <EditorToolbar v-model:selected-tool="selectedToolModel" :groups="toolbarGroups" @tool="handleTool" />
  </div>
</template>
