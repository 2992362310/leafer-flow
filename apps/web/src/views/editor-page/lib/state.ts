import { ref, shallowReactive, type Ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import { getZoomPercent } from "@leafer-flow/core";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import type { LintIssue } from "@leafer-flow/builtin-plugins/builtin/plugins/diagram-lint/types";
import type { SelectionMarqueeState } from "@leafer-flow/ui/composables";
import { HOST_PANEL_IDS, type PagePanelId } from "@leafer-flow/ui/context";

export function usePageState() {
  const elementCount = ref(0);
  const zoomPercent = ref(100);
  const activeTool = ref<string>(TOOL_NAME.SELECT);

  const panels = shallowReactive(new Map<string, Ref<boolean>>(HOST_PANEL_IDS.map((id) => [id, ref(false)])));

  function syncPanels(ids: string[]) {
    const active = new Set<string>([...HOST_PANEL_IDS, ...ids]);
    for (const id of panels.keys()) if (!active.has(id)) panels.delete(id);
    for (const id of active) if (!panels.has(id)) panels.set(id, ref(false));
  }

  function hasPanel(id: PagePanelId) {
    return panels.has(id);
  }

  const diagramLintIssues = ref<LintIssue[]>([]);
  const diagramLintGeneratedAt = ref<number>(Date.now());
  const marquee = ref<SelectionMarqueeState>({ active: false, x: 0, y: 0, width: 0, height: 0 });

  const cleanupCallbacks: Array<() => void> = [];

  function isPanelOpen(id: PagePanelId) {
    return panels.get(id)?.value ?? false;
  }

  function togglePanel(id: PagePanelId) {
    const panel = panels.get(id);
    if (panel) panel.value = !panel.value;
  }

  function openPanel(id: PagePanelId) {
    const panel = panels.get(id);
    if (panel) panel.value = true;
  }

  function closePanel(id: PagePanelId) {
    const panel = panels.get(id);
    if (panel) panel.value = false;
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
    syncPanels,
    hasPanel,
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
