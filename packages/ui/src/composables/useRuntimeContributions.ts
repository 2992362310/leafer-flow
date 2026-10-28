import { onMounted, onUnmounted, ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import { TOOL_NAME } from "@leafer-flow/core/constants";
import { getShortcutConfig, SHORTCUT_CONFIG_CHANGED_EVENT } from "@leafer-flow/core/core/shortcut-config";

export function useRuntimeContributions() {
  const toolLabels = ref<Record<string, string>>({ [TOOL_NAME.SELECT]: "选择" });
  const toolShortcuts = ref<Record<string, string>>({});
  let activeEditor: Editor | undefined;

  function refresh(currentEditor: Editor) {
    activeEditor = currentEditor;
    refreshToolLabels(currentEditor);
    refreshToolShortcuts(currentEditor);
  }

  function handleShortcutChange() {
    if (activeEditor) refresh(activeEditor);
  }

  onMounted(() => window.addEventListener(SHORTCUT_CONFIG_CHANGED_EVENT, handleShortcutChange));
  onUnmounted(() => window.removeEventListener(SHORTCUT_CONFIG_CHANGED_EVENT, handleShortcutChange));

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
    const shortcutConfig = getShortcutConfig();
    const tools = currentEditor.toolRegistry.listToolbarTools();
    for (const contribution of tools) {
      shortcutConfig.ensureToolShortcut(contribution.id, contribution.toolbar?.shortcut);
    }
    const activeToolIds = new Set(currentEditor.toolRegistry.list().map((contribution) => contribution.id));
    toolShortcuts.value = Object.fromEntries(
      shortcutConfig.getAll()
        .filter((entry) => entry.type === "tool" && activeToolIds.has(entry.action) && entry.key)
        .map((entry) => [entry.key, entry.action]),
    );
  }

  return {
    toolLabels,
    toolShortcuts,
    refresh,
  };
}
