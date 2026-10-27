import { watch, type Ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import type { DiagramLintUpdatedEventDetail, LintIssue } from "@leafer-flow/builtin-plugins/builtin/plugins/diagram-lint/types";
import type { PagePanelId } from "@leafer-flow/ui/context";
import type { PageState } from "../views/editor-page/lib/state";

interface UsePageEventsOptions {
  editor: Ref<Editor | undefined>;
  togglePanel: (id: PagePanelId) => void;
  openPanel: (id: PagePanelId) => void;
  closePanel: (id: PagePanelId) => void;
  diagramLintIssues: Ref<LintIssue[]>;
  diagramLintGeneratedAt: Ref<number>;
  addCleanup: PageState["addCleanup"];
}

export function usePageEvents(options: UsePageEventsOptions) {
  const boundEvents = new Set<string>();
  let watching = false;

  function bindEvents() {
    if (!watching) {
      watching = true;
      const stop = watch(options.editor, (editor, _previous, onCleanup) => {
        if (!editor) return;
        onCleanup(editor.overlayPanels.subscribeRequests((request) => {
          if (request.action === "open") options.openPanel(request.id);
          else if (request.action === "close") options.closePanel(request.id);
          else options.togglePanel(request.id);
        }));
      }, { immediate: true, flush: "sync" });
      options.addCleanup(stop);
    }
    bindLintUpdatedEvent();
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

  return {
    bindEvents,
  };
}
