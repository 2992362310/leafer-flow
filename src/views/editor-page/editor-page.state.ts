import { ref } from "vue";
import type { Editor } from "@/editor";
import { getZoomPercent } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import type { LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";
import type { SelectionMarqueeState } from "@/composables/useSelectionMarquee";

export function useEditorPageState() {
  const elementCount = ref(0);
  const zoomPercent = ref(100);
  const activeTool = ref<string>(TOOL_NAME.SELECT);

  const pluginMarketOpen = ref(false);
  const agentOpen = ref(false);
  const minimapOpen = ref(false);
  const multiLayerOpen = ref(false);
  const searchOpen = ref(false);
  const historyOpen = ref(false);
  const diagramLintOpen = ref(false);

  const diagramLintIssues = ref<LintIssue[]>([]);
  const diagramLintGeneratedAt = ref<number>(Date.now());
  const marquee = ref<SelectionMarqueeState>({ active: false, x: 0, y: 0, width: 0, height: 0 });

  const cleanupCallbacks: Array<() => void> = [];

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
    pluginMarketOpen,
    agentOpen,
    minimapOpen,
    multiLayerOpen,
    searchOpen,
    historyOpen,
    diagramLintOpen,
    diagramLintIssues,
    diagramLintGeneratedAt,
    marquee,
    refreshEditorStats,
    addCleanup,
    cleanupAll,
  };
}

export type EditorPageState = ReturnType<typeof useEditorPageState>;
