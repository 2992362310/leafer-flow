<script setup lang="ts">
import { computed } from "vue";
import EditorButton from "@/components/EditorButton.vue";
import EditorToolbar from "@/components/EditorToolbar.vue";
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";
import type { ToolToolbarGroup } from "@/editor/api/tool";
import type { IExecuteCommand } from "@/editor/types";

const props = withDefaults(
  defineProps<{
    toolbarGroups: ToolToolbarGroup[];
    actionButtonGroups: ActionButtonGroupContribution[];
    selectedTool?: string;
    showActionButtons?: boolean;
    showMarketButtons?: boolean;
  }>(),
  {
    showActionButtons: true,
    showMarketButtons: true,
  },
);

const emit = defineEmits<{
  tool: [evt: IExecuteCommand];
  action: [action: string];
  openPluginMarket: [];
  openTemplateMarket: [];
  "update:selectedTool": [tool: string];
}>();

const selectedToolModel = defineModel<string>("selectedTool");
const selectedTool = computed(() => selectedToolModel.value);

function changeTool(tool: string) {
  selectedToolModel.value = tool;
}

defineExpose({
  selectedTool,
  changeTool,
});
</script>

<template>
  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl top-12! left-[calc(50%+5rem)]! -translate-x-1/2">
    <EditorToolbar v-model:selected-tool="selectedToolModel" :groups="toolbarGroups" @tool="emit('tool', $event)" />
    <span v-if="props.showMarketButtons" class="divider divider-horizontal mx-0 my-1"></span>
    <button v-if="props.showMarketButtons" class="btn btn-sm h-9" @click="emit('openPluginMarket')">插件</button>
    <button v-if="props.showMarketButtons" class="btn btn-sm h-9" @click="emit('openTemplateMarket')">模板</button>
    <span v-if="props.showActionButtons" class="divider divider-horizontal mx-0 my-1"></span>
    <EditorButton v-if="props.showActionButtons" :groups="actionButtonGroups" @action="emit('action', $event)" />
  </div>
</template>
