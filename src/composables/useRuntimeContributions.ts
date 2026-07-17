import { ref } from "vue";
import type { Editor } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";

export function useRuntimeContributions() {
  const toolLabels = ref<Record<string, string>>({ [TOOL_NAME.SELECT]: "选择" });
  const toolShortcuts = ref<Record<string, string>>({});

  function refresh(currentEditor: Editor) {
    refreshToolLabels(currentEditor);
    refreshToolShortcuts(currentEditor);
  }

  function refreshToolLabels(currentEditor: Editor) {
    toolLabels.value = {
      [TOOL_NAME.SELECT]: "选择",
      ...Object.fromEntries(
        currentEditor.toolRegistry
          .list()
          .map((contribution) => [contribution.id, contribution.label]),
      ),
    };
  }

  function refreshToolShortcuts(currentEditor: Editor) {
    toolShortcuts.value = Object.fromEntries(
      currentEditor.toolRegistry.listToolbarTools().flatMap((contribution) => {
        const shortcut = contribution.toolbar?.shortcut?.toLowerCase();
        return shortcut ? [[shortcut, contribution.id]] : [];
      }),
    );
  }

  return {
    toolLabels,
    toolShortcuts,
    refresh,
  };
}
