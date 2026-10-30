export const AGENT_PROVIDERS = [
  { id: "openai", name: "OpenAI", protocol: "openai", apiUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { id: "deepseek", name: "DeepSeek", protocol: "openai", apiUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  { id: "qwen", name: "通义千问", protocol: "openai", apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  { id: "doubao", name: "火山引擎 / 豆包", protocol: "openai", apiUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "" },
  { id: "zhipu", name: "智谱 GLM", protocol: "openai", apiUrl: "https://open.bigmodel.cn/api/paas/v4", model: "" },
  { id: "moonshot", name: "Kimi / Moonshot", protocol: "openai", apiUrl: "https://api.moonshot.cn/v1", model: "" },
  { id: "gemini", name: "Google Gemini", protocol: "openai", apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "" },
  { id: "anthropic", name: "Anthropic Claude", protocol: "anthropic", apiUrl: "https://api.anthropic.com/v1", model: "" },
  { id: "ollama", name: "Ollama", protocol: "openai", apiUrl: "http://localhost:11434/v1", model: "" },
  { id: "custom", name: "自定义 OpenAI 兼容", protocol: "openai", apiUrl: "", model: "" },
] as const;

export type AgentProvider = (typeof AGENT_PROVIDERS)[number]["id"];

export interface AgentConfig {
  provider: AgentProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxHistoryMessages: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxHistoryMessages: 20,
};

const STORAGE_KEY = "leafer-flow.plugin.agent.config";

function isStoredConfig(value: unknown): value is AgentConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<AgentConfig>;
  return (
    AGENT_PROVIDERS.some((provider) => provider.id === config.provider) &&
    typeof config.apiUrl === "string" &&
    typeof config.apiKey === "string" &&
    typeof config.model === "string" &&
    typeof config.temperature === "number" &&
    Number.isFinite(config.temperature) &&
    config.temperature >= 0 &&
    config.temperature <= 2 &&
    typeof config.maxHistoryMessages === "number" &&
    Number.isInteger(config.maxHistoryMessages) &&
    config.maxHistoryMessages >= 10 &&
    config.maxHistoryMessages <= 50
  );
}

export function loadAgentConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    return isStoredConfig(saved) ? saved : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAgentConfig(config: AgentConfig): void {
  if (!isStoredConfig(config)) throw new Error("无效的 AI 助手配置");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("保存 Agent 配置失败", error);
  }
}

export function getApiEndpoint(config: AgentConfig): string {
  const base = config.apiUrl.replace(/\/+$/, "");
  const path = config.provider === "anthropic" ? "/messages" : "/chat/completions";
  if (base.endsWith(path)) return base;
  return `${base}${path}`;
}

export function isConfigValid(config: AgentConfig): boolean {
  if (!isStoredConfig(config) || (config.provider !== "ollama" && !config.apiKey.trim()) || !config.model.trim()) return false;
  try {
    return ["https:", "http:"].includes(new URL(config.apiUrl).protocol);
  } catch {
    return false;
  }
}
