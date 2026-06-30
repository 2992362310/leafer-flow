<script setup lang="ts">
import { computed } from "vue";
import EditorButton from "@/components/EditorButton.vue";
import EditorToolbar from "@/components/EditorToolbar.vue";
import { TOOL_NAME } from "@/editor/constants";
import type { Editor } from "@/editor";
import type { IExecuteArg, IExecuteCommand } from "@/editor/types";

const props = withDefaults(
  defineProps<{
    editor?: Editor;
    selectedTool?: string;
    showActionButtons?: boolean;
  }>(),
  {
    showActionButtons: true,
  },
);

const toolbarGroups = computed(() => props.editor?.toolRegistry.getToolbarGroups() ?? []);
const actionButtonGroups = computed(() => props.editor?.actionButtons.list() ?? []);

const emit = defineEmits<{
  action: [action: string];
  "update:selectedTool": [tool: string];
}>();

const selectedToolModel = defineModel<string>("selectedTool");
const selectedTool = computed(() => selectedToolModel.value);

function changeTool(tool: string) {
  selectedToolModel.value = tool;
}

function handleTool(evt: IExecuteCommand) {
  if (!props.editor) return;
  selectedToolModel.value = evt.command;
  props.editor.execute(evt, <T>(arg: T) => {
    const { next } = arg as unknown as IExecuteArg;
    selectedToolModel.value = next ?? TOOL_NAME.SELECT;
  });
}

defineExpose({
  selectedTool,
  changeTool,
});
</script>

<template>
  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl top-12! left-[calc(50%+5rem)]! -translate-x-1/2">
    <EditorToolbar v-model:selected-tool="selectedToolModel" :groups="toolbarGroups" @tool="handleTool" />
    <span v-if="props.showActionButtons" class="divider divider-horizontal mx-0 my-1"></span>
    <EditorButton v-if="props.showActionButtons" :groups="actionButtonGroups" @action="emit('action', $event)" />
  </div>
</template>
