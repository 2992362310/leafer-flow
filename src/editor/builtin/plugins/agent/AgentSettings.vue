<script setup lang="ts">
import { ref, watch } from "vue";
import { type AgentConfig, getApiEndpoint } from "./agent-config";

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

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = { ...newConfig };
  },
);

function handleSave() {
  emit("save", localConfig.value);
}

async function handleTest() {
  if (!localConfig.value.apiUrl || !localConfig.value.apiKey) {
    testStatus.value = "error";
    testMessage.value = "请先填写 API URL 和 API Key";
    return;
  }

  testStatus.value = "testing";
  testMessage.value = "正在测试连接...";

  try {
    const endpoint = getApiEndpoint(localConfig.value);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localConfig.value.apiKey}`,
      },
      body: JSON.stringify({
        model: localConfig.value.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      testStatus.value = "success";
      testMessage.value = "连接成功！API 配置正确。";
    } else {
      const errorText = await response.text();
      testStatus.value = "error";
      testMessage.value = `连接失败 (${response.status}): ${errorText}`;
    }
  } catch (error) {
    testStatus.value = "error";
    testMessage.value = `连接错误: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold">AI 助手设置</h3>
      <button class="btn btn-ghost btn-xs" @click="emit('close')">✕</button>
    </div>

    <!-- API URL -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">API URL</span>
      </div>
      <input
        v-model="localConfig.apiUrl"
        type="text"
        placeholder="https://api.openai.com/v1"
        class="input input-bordered input-xs w-full"
      />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50"
          >OpenAI 兼容 API 地址</span
        >
      </div>
    </label>

    <!-- API Key -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">API Key</span>
      </div>
      <div class="join w-full">
        <input
          v-model="localConfig.apiKey"
          :type="showApiKey ? 'text' : 'password'"
          placeholder="sk-..."
          class="input input-bordered input-xs join-item flex-1"
        />
        <button
          class="btn btn-xs join-item"
          @click="showApiKey = !showApiKey"
        >
          {{ showApiKey ? "隐藏" : "显示" }}
        </button>
      </div>
    </label>

    <!-- 模型 -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">模型</span>
      </div>
      <input
        v-model="localConfig.model"
        type="text"
        placeholder="gpt-4o-mini"
        class="input input-bordered input-xs w-full"
      />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50"
          >如 gpt-4o、gpt-4o-mini、deepseek-chat 等</span
        >
      </div>
    </label>

    <!-- 温度 -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">温度</span>
        <span class="label-text-alt text-xs">{{
          localConfig.temperature.toFixed(1)
        }}</span>
      </div>
      <input
        v-model.number="localConfig.temperature"
        type="range"
        min="0"
        max="2"
        step="0.1"
        class="range range-xs"
      />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50"
          >越低越确定，越高越有创意</span
        >
      </div>
    </label>

    <!-- 最大历史消息数 -->
    <label class="form-control w-full">
      <div class="label p-1">
        <span class="label-text text-xs">最大历史消息数</span>
        <span class="label-text-alt text-xs">{{
          localConfig.maxHistoryMessages
        }}</span>
      </div>
      <input
        v-model.number="localConfig.maxHistoryMessages"
        type="range"
        min="10"
        max="50"
        step="5"
        class="range range-xs"
      />
      <div class="label p-1">
        <span class="label-text-alt text-[10px] opacity-50"
          >超过此数量会提示压缩，建议 15-30</span
        >
      </div>
    </label>

    <!-- 测试连接状态 -->
    <div
      v-if="testStatus !== 'idle'"
      class="text-xs p-2 rounded"
      :class="{
        'bg-info/20 text-info': testStatus === 'testing',
        'bg-success/20 text-success': testStatus === 'success',
        'bg-error/20 text-error': testStatus === 'error',
      }"
    >
      {{ testMessage }}
    </div>

    <!-- 按钮组 -->
    <div class="flex gap-2">
      <button
        class="btn btn-xs flex-1"
        :class="{ 'btn-disabled': testStatus === 'testing' }"
        :disabled="testStatus === 'testing'"
        @click="handleTest"
      >
        {{ testStatus === "testing" ? "测试中..." : "测试连接" }}
      </button>
      <button class="btn btn-primary btn-xs flex-1" @click="handleSave">
        保存设置
      </button>
    </div>
  </div>
</template>
