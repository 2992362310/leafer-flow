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
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold">AI 助手设置</h3>
      <button class="btn btn-ghost btn-xs" @click="emit('close')">✕</button>
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
      <div class="join w-full">
        <input v-model="localConfig.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-..."
          class="input input-bordered input-xs join-item flex-1" />
        <button class="btn btn-xs join-item" @click="showApiKey = !showApiKey">
          {{ showApiKey ? "隐藏" : "显示" }}
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
    <div class="flex gap-2">
      <button class="btn btn-xs flex-1" :class="{ 'btn-disabled': testStatus === 'testing' }"
        :disabled="testStatus === 'testing'" @click="handleTest">
        {{ testStatus === "testing" ? "测试中..." : "测试工具调用" }}
      </button>
      <button class="btn btn-primary btn-xs flex-1" @click="handleSave">保存设置</button>
    </div>
  </div>
</template>
