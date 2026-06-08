<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { IUI } from "leafer";
import type Editor from "@/editor/editor";
import type { PropertyPanelContext } from "@/editor/api/property-panel";
import { CUSTOM_DATA_PROP } from "@/editor/core/flow-serialization";

const props = defineProps<{
  editor: Editor;
  context: PropertyPanelContext;
}>();

type CustomData = Record<string, unknown>;

const rawCustomData = ref("{}");
const errorMessage = ref("");

const selectedElement = computed(() => props.context.selectedElement);

watch(
  selectedElement,
  () => {
    rawCustomData.value = JSON.stringify(readCustomData(selectedElement.value), null, 2);
    errorMessage.value = "";
  },
  { immediate: true },
);

function readCustomData(element: IUI | null): CustomData {
  if (!element) return {};
  const data = (element as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP];
  return isPlainObject(data) ? (data as CustomData) : {};
}

function applyCustomData() {
  const element = selectedElement.value;
  if (!element) return;

  try {
    const parsed = JSON.parse(rawCustomData.value) as unknown;
    if (!isPlainObject(parsed)) {
      errorMessage.value = "自定义数据必须是 JSON 对象";
      return;
    }

    (element as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP] = parsed;
    props.editor.commitMutation();
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "JSON 解析失败";
  }
}

function clearCustomData() {
  const element = selectedElement.value;
  if (!element) return;

  delete (element as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP];
  rawCustomData.value = "{}";
  errorMessage.value = "";
  props.editor.commitMutation();
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

    <textarea
      v-model="rawCustomData"
      class="textarea textarea-bordered textarea-xs min-h-32 w-full resize-y font-mono"
      spellcheck="false"
      placeholder="{}"
    ></textarea>

    <p v-if="errorMessage" class="text-xs text-error">{{ errorMessage }}</p>

    <div class="flex gap-2">
      <button class="btn btn-primary btn-xs" @click="applyCustomData">应用</button>
      <button class="btn btn-ghost btn-xs" @click="clearCustomData">清空</button>
    </div>
  </div>
</template>
