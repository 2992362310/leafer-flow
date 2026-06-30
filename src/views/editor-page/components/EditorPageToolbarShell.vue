<script setup lang="ts">
import EditorTopBar from "@/components/EditorTopBar.vue";
import EditorActionBar from "@/components/EditorActionBar.vue";
import type { Editor } from "@/editor";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();


</script>

<template>
  <EditorTopBar :editor="editor" v-model:selected-tool="state.activeTool.value" :show-action-buttons="false" />

  <EditorActionBar :editor="editor" />
</template>
