<script setup lang="ts">
import { computed } from "vue";
import EditorToolbar from "@/components/EditorToolbar.vue";
import type { Editor } from "@/editor";
import { useInjectedPageCommands } from "@/views/editor-page/lib";

const props = defineProps<{
  editor?: Editor;
  selectedTool?: string;
}>();

const { handleTool } = useInjectedPageCommands();

const toolbarGroups = computed(() => props.editor?.toolRegistry.getToolbarGroups() ?? []);
const selectedToolModel = defineModel<string>("selectedTool");
</script>

<template>
  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl top-12! left-[calc(50%+5rem)]! -translate-x-1/2">
    <EditorToolbar v-model:selected-tool="selectedToolModel" :groups="toolbarGroups" @tool="handleTool" />
  </div>
</template>
