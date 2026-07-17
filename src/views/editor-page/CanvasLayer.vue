<script setup lang="ts">
import { computed } from "vue";
import SelectionMarquee from "@/components/SelectionMarquee.vue";
import ShapeLibrary from "@/components/ShapeLibrary.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import type { Editor } from "@/editor";
import type { PageState } from "@/views/editor-page/lib";
import { useInjectedPageCommands } from "@/views/editor-page/lib";

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
  <SelectionMarquee
    :active="state.marquee.value.active"
    :x="state.marquee.value.x"
    :y="state.marquee.value.y"
    :width="state.marquee.value.width"
    :height="state.marquee.value.height"
  />

  <ShapeLibrary :active-tool="activeTool" :groups="shapeLibraryGroups" @tool="handleLibraryTool" />

  <ContextMenu :editor="editor" @action="handleContextAction" />
</template>
