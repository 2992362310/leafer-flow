<script setup lang="ts">
import { computed } from "vue";
import StatusBar from "@/components/StatusBar.vue";
import ViewControls from "@/components/ViewControls.vue";
import type { Editor } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const selectedTool = computed(() => props.state.activeTool.value);
const elementCount = computed(() => props.state.elementCount.value);
const zoomPercent = computed(() => props.state.zoomPercent.value);

const viewControls = computed(() => {
  if (!props.editor) return [];
  return props.editor.viewControls.list();
});

const toolLabels = computed<Record<string, string>>(() => {
  if (!props.editor) {
    return { [TOOL_NAME.SELECT]: "选择" };
  }

  return {
    [TOOL_NAME.SELECT]: "选择",
    ...Object.fromEntries(
      props.editor.toolRegistry
        .list()
        .map((contribution) => [contribution.id, contribution.label]),
    ),
  };
});

async function handleViewAction(action: string) {
  if (!props.editor) return;
  await props.editor.commands.execute(action);
}
</script>

<template>
  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar :selected-tool="selectedTool" :tool-labels="toolLabels" :element-count="elementCount" />
  </div>

  <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
    <ViewControls :zoom-percent="zoomPercent" :controls="viewControls" @action="handleViewAction" />
  </div>
</template>
