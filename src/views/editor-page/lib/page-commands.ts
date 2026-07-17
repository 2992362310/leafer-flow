import { inject, provide, type InjectionKey } from "vue";
import type { PageCommands } from "@/composables/useEditorCommands";

export type { PageCommands };

export const PAGE_COMMANDS_KEY: InjectionKey<PageCommands> = Symbol("page-commands");

export function providePageCommands(commands: PageCommands) {
  provide(PAGE_COMMANDS_KEY, commands);
  return commands;
}

export function useInjectedPageCommands() {
  const commands = inject(PAGE_COMMANDS_KEY);
  if (!commands) {
    throw new Error("useInjectedPageCommands must be used within editor page");
  }
  return commands;
}
