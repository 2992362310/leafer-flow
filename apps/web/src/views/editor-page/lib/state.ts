import { ref, type Ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import { getZoomPercent } from "@leafer-flow/core";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import type { LintIssue } from "@leafer-flow/builtin-plugins/builtin/plugins/diagram-lint/types";
import type { SelectionMarqueeState } from "@leafer-flow/ui/composables";
import { PAGE_PANEL_IDS, type PagePanelId } from "@leafer-flow/ui/context";

function createPagePanels(): Record<PagePanelId, Ref<boolean>> {
  return Object.fromEntries(PAGE_PANEL_IDS.map((id) => [id, ref(false)])) as Record<
    PagePanelId,
    Ref<boolean>
  >;
}

export function usePageState() {
  const elementCount = ref(0);
  const zoomPercent = ref(100);
  const activeTool = ref<string>(TOOL_NAME.SELECT);

  const panels = createPagePanels();

  const diagramLintIssues = ref<LintIssue[]>([]);
  const diagramLintGeneratedAt = ref<number>(Date.now());
  const marquee = ref<SelectionMarqueeState>({ active: false, x: 0, y: 0, width: 0, height: 0 });

  const cleanupCallbacks: Array<() => void> = [];

  function isPanelOpen(id: PagePanelId) {
    return panels[id].value;
  }

  function togglePanel(id: PagePanelId) {
    panels[id].value = !panels[id].value;
  }

  function openPanel(id: PagePanelId) {
    panels[id].value = true;
  }

  function closePanel(id: PagePanelId) {
    panels[id].value = false;
  }

  function refreshEditorStats(currentEditor: Editor) {
    elementCount.value = currentEditor.app.tree.children.length;
    zoomPercent.value = getZoomPercent(currentEditor);
  }

  function addCleanup(cleanup: () => void) {
    cleanupCallbacks.push(cleanup);
  }

  function cleanupAll() {
    cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
  }

  return {
    elementCount,
    zoomPercent,
    activeTool,
    panels,
    isPanelOpen,
    togglePanel,
    openPanel,
    closePanel,
    diagramLintIssues,
    diagramLintGeneratedAt,
    marquee,
    refreshEditorStats,
    addCleanup,
    cleanupAll,
  };
}

export type PageState = ReturnType<typeof usePageState>;
