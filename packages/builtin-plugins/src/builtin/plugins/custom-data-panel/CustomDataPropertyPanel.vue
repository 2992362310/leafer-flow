<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type Editor from "@leafer-flow/core/editor";
import type { JsonObject } from "@leafer-flow/core";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";

const props = defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
}>();

type CustomData = JsonObject;

const rawCustomData = ref("{}");
const errorMessage = ref("");

const selectedNodeId = computed(() => props.context.selectedElement
  ? props.editor.renderer.getId(props.context.selectedElement)
  : null);

watch(
  selectedNodeId,
  () => {
    rawCustomData.value = JSON.stringify(readCustomData(), null, 2);
    errorMessage.value = "";
  },
  { immediate: true },
);

function readCustomData(): CustomData {
  if (!selectedNodeId.value) return {};
  const data = props.editor.document.getNode(selectedNodeId.value)?.data.customData;
  return isPlainObject(data) ? data as CustomData : {};
}

function applyCustomData() {
  const id = selectedNodeId.value;
  if (!id) return;

  try {
    const parsed = JSON.parse(rawCustomData.value) as unknown;
    if (!isPlainObject(parsed)) {
      errorMessage.value = "自定义数据必须是 JSON 对象";
      return;
    }

    props.editor.documentCommands.setCustomData(id, parsed as JsonObject);
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "JSON 解析失败";
  }
}

function clearCustomData() {
  const id = selectedNodeId.value;
  if (!id) return;

  props.editor.documentCommands.setCustomData(id);
  rawCustomData.value = "{}";
  errorMessage.value = "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-[11px] leading-relaxed text-base-content/60">
      这是一个插件属性面板示例，用于编辑选中元素的自定义 JSON 数据。
    </p>

    <textarea v-model="rawCustomData" class="textarea textarea-bordered textarea-xs min-h-32 w-full resize-y font-mono"
      spellcheck="false" placeholder="{}"></textarea>

    <p v-if="errorMessage" class="text-xs text-error">{{ errorMessage }}</p>

    <div class="flex gap-2">
      <button class="btn btn-primary btn-xs" @click="applyCustomData">应用</button>
      <button class="btn btn-ghost btn-xs" @click="clearCustomData">清空</button>
    </div>
  </div>
</template>
