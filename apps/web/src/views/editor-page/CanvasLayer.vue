<script setup lang="ts">
import { computed } from "vue";
import { SelectionMarquee, ShapeLibrary, ContextMenu } from "@leafer-flow/ui/components";
import type { Editor } from "@leafer-flow/core";
import type { PageState } from "./lib";
import { useInjectedPageCommands } from "./lib";

const props = defineProps<{
  editor: Editor | undefined;
  state: PageState;
}>();

const { activateTool, handleAction } = useInjectedPageCommands();

const activeTool = computed(() => props.state.activeTool.value);
const shapeLibraryGroups = computed(() => {
  if (!props.editor) return [];
  return props.editor.toolRegistry.getShapeLibraryGroups();
});

function handleLibraryTool(tool: string) {
  activateTool(tool);
}

async function handleContextAction(action: string) {
  await handleAction(action);
}
</script>

<template>
  <SelectionMarquee :active="state.marquee.value.active" :x="state.marquee.value.x" :y="state.marquee.value.y"
    :width="state.marquee.value.width" :height="state.marquee.value.height" />

  <ShapeLibrary :active-tool="activeTool" :groups="shapeLibraryGroups" @tool="handleLibraryTool" />

  <ContextMenu :editor="editor" @action="handleContextAction" />
</template>
