<script setup lang="ts">
import { useRouter } from "vue-router";
import EditorTopBar from "@/components/EditorTopBar.vue";
import EditorActionBar from "@/components/EditorActionBar.vue";
import type { Editor } from "@/editor";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const router = useRouter();

async function handleAction(action: string) {
  if (!props.editor) return;
  const result = await props.editor.commands.execute(action);
  if (result.refreshZoom) {
    props.state.refreshEditorStats(props.editor);
  }
}

function openPluginMarketPage() {
  router.push("/plugin-market");
}

function openTemplateMarketPage() {
  router.push("/template-market");
}

</script>

<template>
  <EditorTopBar :editor="editor" v-model:selected-tool="state.activeTool.value" :show-action-buttons="false"
    :show-market-buttons="false" />

  <EditorActionBar :editor="editor" :show-market-buttons="true" @action="handleAction"
    @open-plugin-market="openPluginMarketPage" @open-template-market="openTemplateMarketPage" />
</template>
