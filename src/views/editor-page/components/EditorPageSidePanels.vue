<script setup lang="ts">
import { computed } from "vue";
import type { Editor } from "@/editor";
import type { EditorPageState } from "@/views/editor-page/editor-page.state";
import LayerPanel from "@/components/LayerTree/LayerPanel.vue";
import EditorPanel from "@/components/EditorPanel.vue";

const props = defineProps<{
  editor: Editor | undefined;
  state: EditorPageState;
}>();

const multiLayerOpen = computed(() => props.state.multiLayerOpen.value);
</script>

<template>
  <LayerPanel :editor="editor" :open="multiLayerOpen" />
  <EditorPanel :editor="editor" class="z-10" />
</template>
