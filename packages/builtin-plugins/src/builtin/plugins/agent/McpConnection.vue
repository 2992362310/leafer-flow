<script setup lang="ts">
import { ref } from "vue";
import type { ConnectionOptions } from "./mcp-bridge";

const props = defineProps<{
    status: "disconnected" | "connecting" | "connected";
    error: string;
    sessionId: string;
    connectionPort: number;
    writeGranted: boolean;
}>();
const emit = defineEmits<{ connect: [options: ConnectionOptions]; disconnect: []; close: [] }>();
const port = ref(props.connectionPort);
const token = ref("");
const allowWrite = ref(props.writeGranted);

function connect() {
    if (props.status !== "disconnected") return;
    emit("connect", { port: port.value, token: token.value.trim(), allowWrite: allowWrite.value });
    token.value = "";
}
</script>

<template>
    <form class="mcp-connection" @submit.prevent="connect">
        <header>
            <h3>MCP 连接</h3>
            <button type="button" class="mcp-back" @click="emit('close')">返回对话</button>
        </header>
        <p class="mcp-consent">连接后，已授权的外部 AI 客户端可以访问当前文档。</p>
        <label>
            <span>本机端口</span>
            <input v-model.number="port" type="number" min="1024" max="65535" required
                :disabled="status !== 'disconnected'" />
        </label>
        <label>
            <span>本机令牌</span>
            <input v-model="token" type="password" autocomplete="off" spellcheck="false"
                placeholder="用户目录 .leafer-flow/mcp-token 中的令牌" :required="status === 'disconnected'"
                :disabled="status !== 'disconnected'" />
        </label>
        <label class="mcp-write">
            <input v-model="allowWrite" type="checkbox" :disabled="status !== 'disconnected'" />
            <span>允许修改当前文档</span>
        </label>
        <p class="mcp-consent">默认只读。断开或取消连接不会回滚已经完成的修改。</p>
        <div v-if="error" role="alert" class="mcp-error">{{ error }}</div>
        <div v-if="status === 'connected'" role="status" class="mcp-session">
            <strong>已连接 · {{ writeGranted ? '允许写入' : '只读' }}</strong>
            <span>会话 ID</span><code>{{ sessionId }}</code>
        </div>
        <button v-if="status === 'disconnected'" type="submit" class="mcp-connect"
            :disabled="!token.trim()">授权并连接</button>
        <button v-else type="button" class="mcp-disconnect" @click="emit('disconnect')">
            {{ status === 'connecting' ? '取消连接' : '断开连接' }}
        </button>
    </form>
</template>

<style scoped>
.mcp-connection {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    font-size: 12px;
}

header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.mcp-back {
    border: 0;
    background: none;
    color: var(--agent-accent);
    font-size: 11px;
    cursor: pointer;
}

label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-size: 11px;
    font-weight: 600;
}

input:not([type="checkbox"]) {
    width: 100%;
    min-width: 0;
    height: 35px;
    border: 1px solid var(--color-base-300);
    border-radius: 6px;
    padding: 0 10px;
    background: var(--color-base-100);
    color: inherit;
    font-size: 12px;
}

input:focus {
    outline: 2px solid color-mix(in oklab, var(--agent-accent) 15%, transparent);
    border-color: var(--agent-accent);
}

.mcp-write {
    flex-direction: row;
    align-items: center;
    gap: 8px;
}

.mcp-write input {
    accent-color: var(--agent-accent);
}

.mcp-consent {
    margin: 0;
    color: color-mix(in oklab, var(--color-base-content) 60%, transparent);
    font-size: 11px;
    line-height: 1.8;
}

.mcp-error {
    color: var(--color-error);
    overflow-wrap: anywhere;
}

.mcp-session {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-block: 14px;
    border-block: 1px solid var(--color-base-200);
    color: var(--agent-accent);
}

.mcp-session code {
    color: var(--color-base-content);
    font-size: 11px;
    overflow-wrap: anywhere;
}

.mcp-connect,
.mcp-disconnect {
    min-height: 35px;
    border: 1px solid var(--agent-accent);
    border-radius: 6px;
    background: var(--agent-accent);
    color: var(--color-base-100);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}

.mcp-connect:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.mcp-disconnect {
    background: transparent;
    color: var(--agent-accent);
}
</style>
