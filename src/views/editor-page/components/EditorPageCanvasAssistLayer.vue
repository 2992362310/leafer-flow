<script setup lang="ts">
import { computed } from "vue";
import SelectionMarquee from "@/components/SelectionMarquee.vue";
import ShapeLibrary from "@/components/ShapeLibrary.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import type { Editor } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import type { IExecuteArg } from "@/editor/types";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const activeTool = computed(() => props.state.activeTool.value);
const shapeLibraryGroups = computed(() => {
  if (!props.editor) return [];
  return props.editor.toolRegistry.getShapeLibraryGroups();
});

function setCurrentTool(tool: string) {
  props.state.activeTool.value = tool;
}

function executeCallback<T>(arg: T) {
  const { next } = arg as IExecuteArg;
  setCurrentTool(next ?? TOOL_NAME.SELECT);
}

function handleLibraryTool(tool: string) {
  if (!props.editor) return;
  const command = { command: tool, pre: props.state.activeTool.value };
  setCurrentTool(tool);
  props.editor.execute(command, executeCallback);
}

async function handleContextAction(action: string) {
  if (!props.editor) return;
  await props.editor.commands.execute(action);
}
</script>

<template>
  <SelectionMarquee :active="state.marquee.value.active" :x="state.marquee.value.x" :y="state.marquee.value.y"
    :width="state.marquee.value.width" :height="state.marquee.value.height" />

  <ShapeLibrary :active-tool="activeTool" :groups="shapeLibraryGroups" @tool="handleLibraryTool" />

  <ContextMenu :editor="editor" @action="handleContextAction" />
</template>
