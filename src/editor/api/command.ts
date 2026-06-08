import type Editor from "../editor";

export interface CommandResult {
  success: boolean;
  message: string;
  warning?: boolean;
  refreshZoom?: boolean;
}

export interface CommandContribution<TPayload = unknown> {
  id: string;
  label: string;
  pluginId?: string;
  warning?: boolean;
  refreshZoom?: boolean;
  match?(id: string): TPayload | null;
  run(editor: Editor, payload?: TPayload): CommandResult | Promise<CommandResult>;
}
