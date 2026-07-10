import type { Ref } from "vue";
import type { Editor } from "@/editor";
import type { DiagramLintUpdatedEventDetail, LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";
import { HOST_PANEL_TOGGLE_EVENTS, type PagePanelId, type PageState } from "@/views/editor-page";

interface UsePageEventsOptions {
  editor: Ref<Editor | undefined>;
  togglePanel: (id: PagePanelId) => void;
  openPanel: (id: PagePanelId) => void;
  diagramLintIssues: Ref<LintIssue[]>;
  diagramLintGeneratedAt: Ref<number>;
  addCleanup: PageState["addCleanup"];
}

function collectToggleEvents(editor: Editor | undefined): Partial<Record<PagePanelId, string>> {
  const events: Partial<Record<PagePanelId, string>> = { ...HOST_PANEL_TOGGLE_EVENTS };

  if (editor) {
    Object.assign(events, editor.overlayPanels.getToggleEvents());
  }

  return events;
}

export function usePageEvents(options: UsePageEventsOptions) {
  function bindEvents() {
    const toggleEvents = collectToggleEvents(options.editor.value);

    for (const [panelId, eventName] of Object.entries(toggleEvents) as Array<
      [PagePanelId, string]
    >) {
      bindToggleEvent(eventName, panelId);
    }

    bindLintUpdatedEvent();
    bindAgentShortcut();
  }

  function bindToggleEvent(eventName: string, panelId: PagePanelId) {
    const handler = () => {
      options.togglePanel(panelId);
    };

    window.addEventListener(eventName, handler);
    options.addCleanup(() => {
      window.removeEventListener(eventName, handler);
    });
  }

  function bindLintUpdatedEvent() {
    const handleLintUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DiagramLintUpdatedEventDetail>;
      options.diagramLintIssues.value = customEvent.detail?.issues ?? [];
      options.diagramLintGeneratedAt.value = customEvent.detail?.generatedAt ?? Date.now();
      options.openPanel("diagram-lint");
    };

    window.addEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
    options.addCleanup(() => {
      window.removeEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
    });
  }

  function bindAgentShortcut() {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const { ctrlKey, metaKey, shiftKey, key } = event;
      const isCmd = ctrlKey || metaKey;
      if (isCmd && shiftKey && key.toLowerCase() === "a") {
        event.preventDefault();
        options.togglePanel("agent-chat");
      }
    };

    window.addEventListener("keydown", handleKeydown);
    options.addCleanup(() => {
      window.removeEventListener("keydown", handleKeydown);
    });
  }

  return {
    bindEvents,
  };
}
