import type { CommandContribution, CommandResult } from "../api/command";
import type Editor from "../editor";

type CommandMatch<TPayload = unknown> = {
  command: CommandContribution<TPayload>;
  payload?: TPayload;
};

export class CommandRegistry {
  private editor: Editor;
  private contributions = new Map<string, CommandContribution>();

  constructor(editor: Editor) {
    this.editor = editor;
  }

  register<TPayload = unknown>(
    command: CommandContribution<TPayload>,
  ): CommandContribution<TPayload> {
    const existing = this.contributions.get(command.id) as
      | CommandContribution<TPayload>
      | undefined;
    if (existing) return existing;

    this.contributions.set(command.id, command as CommandContribution);
    return command;
  }

  unregister(id: string): void {
    this.contributions.delete(id);
  }

  unregisterByPlugin(pluginId: string): void {
    this.contributions.forEach((command, id) => {
      if (command.pluginId === pluginId) {
        this.contributions.delete(id);
      }
    });
  }

  async execute<TPayload = unknown>(id: string, payload?: TPayload): Promise<CommandResult> {
    const matched = this.resolve(id, payload);
    if (!matched) {
      return { success: false, message: `未知操作: ${id}` };
    }

    const result = await matched.command.run(this.editor, matched.payload);
    return {
      ...result,
      warning: result.warning ?? matched.command.warning,
      refreshZoom: result.refreshZoom ?? matched.command.refreshZoom,
    };
  }

  has(id: string): boolean {
    return Boolean(this.resolve(id));
  }

  get(id: string): CommandContribution | undefined {
    return this.resolve(id)?.command;
  }

  list(): CommandContribution[] {
    return [...this.contributions.values()];
  }

  listByPlugin(pluginId: string): CommandContribution[] {
    return this.list().filter((command) => command.pluginId === pluginId);
  }

  private resolve<TPayload = unknown>(
    id: string,
    payload?: TPayload,
  ): CommandMatch<TPayload> | null {
    const exact = this.contributions.get(id) as CommandContribution<TPayload> | undefined;
    if (exact) return { command: exact, payload };

    for (const command of this.contributions.values()) {
      const matchedPayload = command.match?.(id);
      if (matchedPayload != null) {
        return {
          command: command as CommandContribution<TPayload>,
          payload: matchedPayload as TPayload,
        };
      }
    }

    return null;
  }
}
