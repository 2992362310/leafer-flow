<script setup lang="ts">
import { ref, watch } from "vue";
import type { Editor } from "@/editor";
import type { PluginConfigSchema, PluginConfigField } from "@/editor/api/plugin";

interface Props {
  pluginId: string;
  config: PluginConfigSchema;
  editor?: Editor;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

// 配置值
const configValues = ref<Record<string, unknown>>({});

// 初始化配置值
watch(
  () => props.config,
  (config) => {
    if (!config) return;

    const values: Record<string, unknown> = {};
    for (const field of config.fields) {
      values[field.key] = loadConfigValue(field);
    }
    configValues.value = values;
  },
  { immediate: true },
);

function loadConfigValue(field: PluginConfigField): unknown {
  try {
    const key = `leafer-flow.plugin.${props.pluginId}.config.${field.key}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch {
    // 忽略解析错误
  }
  return field.default;
}

function saveConfigValue(key: string, value: unknown) {
  try {
    const storageKey = `leafer-flow.plugin.${props.pluginId}.config.${key}`;
    localStorage.setItem(storageKey, JSON.stringify(value));
    configValues.value[key] = value;
  } catch (error) {
    console.warn("保存配置失败", error);
  }
}

function handleSave() {
  // 保存所有配置
  for (const [key, value] of Object.entries(configValues.value)) {
    saveConfigValue(key, value);
  }
  emit("close");
}
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
    <div class="relative bg-base-100 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b border-base-200">
        <h3 class="font-semibold">插件配置</h3>
        <button class="btn btn-ghost btn-sm btn-square" @click="emit('close')">✕</button>
      </div>

      <div class="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
        <div v-for="field in config.fields" :key="field.key" class="form-control">
          <label class="label">
            <span class="label-text text-sm">{{ field.label }}</span>
          </label>

          <!-- 文本输入 -->
          <input
            v-if="field.type === 'text'"
            v-model="configValues[field.key]"
            type="text"
            :placeholder="field.placeholder"
            class="input input-bordered input-sm w-full"
            @change="saveConfigValue(field.key, configValues[field.key])"
          />

          <!-- 数字输入 -->
          <input
            v-else-if="field.type === 'number'"
            v-model.number="configValues[field.key]"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            class="input input-bordered input-sm w-full"
            @change="saveConfigValue(field.key, configValues[field.key])"
          />

          <!-- 布尔开关 -->
          <label
            v-else-if="field.type === 'boolean'"
            class="label cursor-pointer justify-start gap-2"
          >
            <input
              v-model="configValues[field.key]"
              type="checkbox"
              class="toggle toggle-sm toggle-primary"
              @change="saveConfigValue(field.key, configValues[field.key])"
            />
            <span class="label-text">{{ configValues[field.key] ? "开启" : "关闭" }}</span>
          </label>

          <!-- 下拉选择 -->
          <select
            v-else-if="field.type === 'select'"
            v-model="configValues[field.key]"
            class="select select-bordered select-sm w-full"
            @change="saveConfigValue(field.key, configValues[field.key])"
          >
            <option v-for="option in field.options" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <!-- 颜色选择 -->
          <input
            v-else-if="field.type === 'color'"
            v-model="configValues[field.key]"
            type="color"
            class="h-8 w-full cursor-pointer rounded border border-base-300"
            @change="saveConfigValue(field.key, configValues[field.key])"
          />
        </div>

        <div v-if="config.fields.length === 0" class="text-center text-sm text-base-content/50 py-8">
          此插件没有可配置的选项
        </div>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-base-200">
        <button class="btn btn-sm" @click="emit('close')">关闭</button>
        <button class="btn btn-primary btn-sm" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>
