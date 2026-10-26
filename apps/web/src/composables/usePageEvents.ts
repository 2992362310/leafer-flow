import type { Ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import type { DiagramLintUpdatedEventDetail, LintIssue } from "@leafer-flow/builtin-plugins/builtin/plugins/diagram-lint/types";
import { HOST_PANEL_TOGGLE_EVENTS, type PagePanelId } from "@leafer-flow/ui/context";
import type { PageState } from "../views/editor-page/lib/state";

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
  const boundEvents = new Set<string>();

  function bindEvents() {
    const toggleEvents = collectToggleEvents(options.editor.value);

    for (const [panelId, eventName] of Object.entries(toggleEvents) as Array<
      [PagePanelId, string]
    >) {
      bindToggleEvent(eventName, panelId);
    }

    bindLintUpdatedEvent();
  }

  /** Bind host-only panel toggles immediately (before editor async init finishes). */
  function bindHostEvents() {
    for (const [panelId, eventName] of Object.entries(HOST_PANEL_TOGGLE_EVENTS) as Array<
      [PagePanelId, string]
    >) {
      bindToggleEvent(eventName, panelId);
    }
  }

  function bindToggleEvent(eventName: string, panelId: PagePanelId) {
    if (boundEvents.has(eventName)) return;
    boundEvents.add(eventName);

    const handler = () => {
      options.togglePanel(panelId);
    };

    window.addEventListener(eventName, handler);
    options.addCleanup(() => {
      window.removeEventListener(eventName, handler);
      boundEvents.delete(eventName);
    });
  }

  function bindLintUpdatedEvent() {
    const eventName = "leafer-flow:diagram-lint-updated";
    if (boundEvents.has(eventName)) return;
    boundEvents.add(eventName);

    const handleLintUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DiagramLintUpdatedEventDetail>;
      options.diagramLintIssues.value = customEvent.detail?.issues ?? [];
      options.diagramLintGeneratedAt.value = customEvent.detail?.generatedAt ?? Date.now();
      options.openPanel("diagram-lint");
    };

    window.addEventListener(eventName, handleLintUpdated);
    options.addCleanup(() => {
      window.removeEventListener(eventName, handleLintUpdated);
      boundEvents.delete(eventName);
    });
  }

  function bindOpenConnectorPanelEvent() {
    const eventName = "leafer-flow:open-connector-panel";
    if (boundEvents.has(eventName)) return;
    boundEvents.add(eventName);

    const handler = () => {
      options.openPanel("connector-panel");
    };

    window.addEventListener(eventName, handler);
    options.addCleanup(() => {
      window.removeEventListener(eventName, handler);
      boundEvents.delete(eventName);
    });
  }

  bindOpenConnectorPanelEvent();

  return {
    bindEvents,
    bindHostEvents,
  };
}
