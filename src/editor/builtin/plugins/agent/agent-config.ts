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

export function loadAgentConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };

    const saved = JSON.parse(raw) as Partial<AgentConfig>;
    return {
      apiUrl: saved.apiUrl || DEFAULT_CONFIG.apiUrl,
      apiKey: saved.apiKey || DEFAULT_CONFIG.apiKey,
      model: saved.model || DEFAULT_CONFIG.model,
      temperature:
        typeof saved.temperature === "number" ? saved.temperature : DEFAULT_CONFIG.temperature,
      maxHistoryMessages:
        typeof saved.maxHistoryMessages === "number" ? saved.maxHistoryMessages : DEFAULT_CONFIG.maxHistoryMessages,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAgentConfig(config: AgentConfig): void {
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
  return Boolean(config.apiUrl && config.apiKey && config.model);
}
