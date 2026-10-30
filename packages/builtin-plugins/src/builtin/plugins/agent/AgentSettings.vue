<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { AGENT_PROVIDERS, type AgentConfig, isConfigValid } from "./agent-config";
import { testToolCalling } from "./agent-client";

interface Props {
  config: AgentConfig;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [config: AgentConfig];
  close: [];
}>();

const localConfig = ref<AgentConfig>({ ...props.config });
const showApiKey = ref(false);
const testStatus = ref<"idle" | "testing" | "success" | "error">("idle");
const testMessage = ref("");
let testController: AbortController | undefined;
onUnmounted(() => testController?.abort());

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = { ...newConfig };
  },
);

watch(localConfig, () => {
  testController?.abort();
  testController = undefined;
  testStatus.value = "idle";
  testMessage.value = "";
}, { deep: true });

function handleProviderChange(event: Event) {
  const provider = AGENT_PROVIDERS.find((item) => item.id === (event.target as HTMLSelectElement).value);
  if (!provider) return;
  localConfig.value = {
    ...localConfig.value,
    provider: provider.id,
    apiUrl: provider.apiUrl,
    model: provider.model,
    apiKey: "",
  };
}

function handleSave() {
  emit("save", localConfig.value);
}

async function handleTest() {
  if (testStatus.value === "testing") return;
  if (!isConfigValid(localConfig.value)) {
    testStatus.value = "error";
    testMessage.value = "请先填写有效的 API 地址、模型及所需密钥（Ollama 可不填密钥）";
    return;
  }

  testStatus.value = "testing";
  testMessage.value = "正在验证工具调用...";
  const controller = new AbortController();
  testController = controller;

  try {
    await testToolCalling({ ...localConfig.value }, controller.signal);
    if (testController !== controller) return;
    testStatus.value = "success";
    testMessage.value = "工具调用验证通过（未修改画布）。此探测不保证复杂参数和布局的生成质量。";
  } catch (error) {
    if (testController !== controller) return;
    testStatus.value = "error";
    testMessage.value = `工具调用验证失败: ${error instanceof Error ? error.message : "未知错误"}`;
  } finally {
    if (testController === controller) testController = undefined;
  }
}
</script>

<template>
  <div class="agent-settings">
    <div class="settings-heading">
      <h3>模型连接</h3>
      <button class="settings-back" title="返回对话" @click="emit('close')">
        <Icon name="arrow-up" class="h-3 w-3 -rotate-90" aria-hidden="true" />返回对话
      </button>
    </div>

    <label class="form-control w-full">
      <div class="label p-1"><span class="label-text text-xs">模型厂商</span></div>
      <select :value="localConfig.provider" class="select select-bordered select-xs w-full"
        @change="handleProviderChange">
        <option v-for="provider in AGENT_PROVIDERS" :key="provider.id" :value="provider.id">{{ provider.name }}</option>
      </select>
    </label>

    <!-- API URL -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">API URL</span>
      </div>
      <input v-model="localConfig.apiUrl" type="text" placeholder="https://api.openai.com/v1"
        class="input input-bordered input-xs w-full" />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-70">
          {{ localConfig.provider === 'anthropic' ? 'Claude 原生 Messages API' : 'OpenAI 兼容 Chat Completions API' }}
        </span>
      </div>
    </label>

    <!-- API Key -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">API Key{{ localConfig.provider === 'ollama' ? '（可选）' : '' }}</span>
      </div>
      <div class="settings-key">
        <input v-model="localConfig.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-..."
          class="input input-bordered input-xs w-full" />
        <button class="settings-key-toggle" :title="showApiKey ? '隐藏密钥' : '显示密钥'"
          :aria-label="showApiKey ? '隐藏密钥' : '显示密钥'" @click="showApiKey = !showApiKey">
          <Icon :name="showApiKey ? 'hidden' : 'visible'" class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </label>

    <!-- 模型 -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">{{ localConfig.provider === 'doubao' ? '模型 / 推理接入点 ID' : '模型 ID' }}</span>
      </div>
      <input v-model="localConfig.model" type="text" placeholder="填写账号中可用且支持工具调用的模型 ID"
        class="input input-bordered input-xs w-full" />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-70">选择可靠支持 Function Calling 的模型；复杂布局优先使用模板</span>
      </div>
    </label>

    <!-- 温度 -->
    <label v-if="localConfig.provider !== 'anthropic'" class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">温度</span>
        <span class="label-text-alt text-xs">{{ localConfig.temperature.toFixed(1) }}</span>
      </div>
      <input v-model.number="localConfig.temperature" type="range" min="0" max="2" step="0.1" class="range range-xs" />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50">越低越确定，越高越有创意</span>
      </div>
    </label>

    <!-- 最大历史消息数 -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">最大历史消息数</span>
        <span class="label-text-alt text-xs">{{ localConfig.maxHistoryMessages }}</span>
      </div>
      <input v-model.number="localConfig.maxHistoryMessages" type="range" min="10" max="50" step="5"
        class="range range-xs" />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50">超过此数量会提示压缩，建议 15-30</span>
      </div>
    </label>

    <!-- 测试连接状态 -->
    <div v-if="testStatus !== 'idle'" class="text-xs p-2 rounded" :class="{
      'bg-info/20 text-info': testStatus === 'testing',
      'bg-success/20 text-success': testStatus === 'success',
      'bg-error/20 text-error': testStatus === 'error',
    }">
      {{ testMessage }}
    </div>

    <!-- 按钮组 -->
    <div class="settings-actions">
      <button class="settings-test" :disabled="testStatus === 'testing'" @click="handleTest">
        {{ testStatus === "testing" ? "测试中..." : "测试工具调用" }}
      </button>
      <button class="settings-save" @click="handleSave">保存设置</button>
    </div>
  </div>
</template>

<style scoped>
.agent-settings {
  display: flex;
  flex-direction: column;
  gap: 17px;
  min-width: 0;
  font-size: 12px;
}

.settings-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 3px;
}

.settings-heading h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.settings-back {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  color: var(--agent-accent, #087b6b);
  font-size: 11px;
  cursor: pointer;
}

.form-control {
  display: block;
  min-width: 0;
}

.label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 7px;
  white-space: normal;
}

.label-text {
  font-size: 11px;
  font-weight: 600;
}

.label-text-alt {
  font-size: 10px;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.form-control>.label:last-child:not(:first-child) {
  padding: 6px 0 0;
}

.input,
.select {
  min-width: 0;
  width: 100%;
  height: 35px;
  min-height: 35px;
  border: 1px solid var(--color-base-300);
  border-radius: 6px;
  background-color: var(--color-base-100);
  color: var(--color-base-content);
  padding-inline: 10px;
  font-size: 12px;
  box-shadow: none;
}

.select {
  padding-right: 28px;
}

.input::placeholder {
  color: color-mix(in oklab, var(--color-base-content) 35%, transparent);
}

.input:focus,
.select:focus {
  border-color: var(--agent-accent, #087b6b);
  outline: 2px solid color-mix(in oklab, var(--agent-accent, #087b6b) 12%, transparent);
  outline-offset: 0;
}

.range {
  color: var(--agent-accent, #087b6b);
  --range-bg: var(--color-base-200);
}

.settings-key {
  position: relative;
}

.settings-key input {
  padding-right: 38px;
}

.settings-key-toggle {
  position: absolute;
  right: 3px;
  top: 3px;
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  background: none;
  border: 0;
  border-radius: 4px;
  color: color-mix(in oklab, var(--color-base-content) 45%, transparent);
  cursor: pointer;
}

.settings-key-toggle:hover {
  background: var(--color-base-200);
  color: var(--agent-accent, #087b6b);
}

.settings-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-base-200);
}

.settings-actions button {
  min-height: 35px;
  border: 1px solid var(--color-base-300);
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.settings-test {
  background: var(--color-base-100);
  color: var(--color-base-content);
}

.settings-test:disabled {
  opacity: 0.5;
  cursor: wait;
}

.settings-actions .settings-save {
  background: var(--agent-accent, #087b6b);
  border-color: var(--agent-accent, #087b6b);
  color: var(--color-base-100);
}

button:focus-visible {
  outline: 2px solid var(--agent-accent, #087b6b);
  outline-offset: 3px;
}
</style>
