<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import EditorTopBar from "@/components/EditorTopBar.vue";
import EditorActionBar from "@/components/EditorActionBar.vue";
import { TOOL_NAME } from "@/editor/constants";
import type { Editor } from "@/editor";
import type { IExecuteArg, IExecuteCommand } from "@/editor/types";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const router = useRouter();

const toolbarGroups = computed(() => {
  if (!props.editor) return [];
  return props.editor.toolRegistry.getToolbarGroups();
});

const actionButtonGroups = computed(() => {
  if (!props.editor) return [];
  return props.editor.actionButtons.list();
});

function setCurrentTool(tool: string) {
  props.state.activeTool.value = tool;
}

function executeCallback<T>(arg: T) {
  const { next } = arg as IExecuteArg;
  setCurrentTool(next ?? TOOL_NAME.SELECT);
}

function handleTool(evt: IExecuteCommand) {
  if (!props.editor) return;
  setCurrentTool(evt.command);
  props.editor.execute(evt, executeCallback);
}

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

function updateSelectedTool(tool: string) {
  props.state.activeTool.value = tool;
}
</script>

<template>
  <EditorTopBar :selected-tool="state.activeTool.value" :toolbar-groups="toolbarGroups"
    :action-button-groups="actionButtonGroups" :show-action-buttons="false" :show-market-buttons="false"
    @update:selected-tool="updateSelectedTool" @tool="handleTool" @action="handleAction"
    @open-plugin-market="openPluginMarketPage" @open-template-market="openTemplateMarketPage" />

  <EditorActionBar :action-button-groups="actionButtonGroups" :show-market-buttons="true" @action="handleAction"
    @open-plugin-market="openPluginMarketPage" @open-template-market="openTemplateMarketPage" />
</template>
