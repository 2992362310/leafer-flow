export interface AgentConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxHistoryMessages: number;
}

const DEFAULT_CONFIG: AgentConfig = {
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
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

export function isConfigValid(config: AgentConfig): boolean {
  if (!isStoredConfig(config) || !config.apiKey.trim() || !config.model.trim()) return false;
  try {
    return ["https:", "http:"].includes(new URL(config.apiUrl).protocol);
  } catch {
    return false;
  }
}
