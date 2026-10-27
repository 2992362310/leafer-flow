import { onUnmounted, type Ref } from "vue";
import { WatchEvent } from "leafer";
import { initEditor, type Editor } from "../editor";

type LogLevel = "info" | "success" | "warning" | "error";

interface EditorLogRef {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

interface UseEditorAppInitOptions {
  editor: Ref<Editor | undefined>;
  editorElement: Ref<HTMLElement | null>;
  logRef: Ref<EditorLogRef | null>;
  refreshRuntimeToolContributions: (editor: Editor) => void;
  bindSelectionMarquee: (editor: Editor) => void;
  bindShapeDrop: (editor: Editor) => void;
  refreshEditorStats: (editor: Editor) => void;
}

export function useEditorAppInit({
  editor,
  editorElement,
  logRef,
  refreshRuntimeToolContributions,
  bindSelectionMarquee,
  bindShapeDrop,
  refreshEditorStats,
}: UseEditorAppInitOptions) {
  let disposed = false;
  let removeStatsListener: (() => void) | undefined;

  onUnmounted(() => {
    disposed = true;
    removeStatsListener?.();
    const currentEditor = editor.value;
    editor.value = undefined;
    void currentEditor?.dispose().catch((error) => console.error("Editor disposal failed", error));
  });

  async function initializeApp() {
    if (disposed || !editorElement.value) return false;

    const currentEditor = await initEditor(editorElement.value);
    if (disposed) {
      await currentEditor.dispose();
      return false;
    }
    editor.value = currentEditor;
    refreshRuntimeToolContributions(currentEditor);
    bindSelectionMarquee(currentEditor);
    bindShapeDrop(currentEditor);

    const refresh = () => {
      if (!disposed) refreshEditorStats(currentEditor);
    };
    currentEditor.app.tree.on(WatchEvent.DATA, refresh);
    removeStatsListener = () => currentEditor.app.tree.off(WatchEvent.DATA, refresh);

    await restoreAutosave(currentEditor);
    if (disposed) return false;
    logRef.value?.addLog({ message: "应用初始化完成", level: "success" });
    return true;
  }

  async function restoreAutosave(currentEditor: Editor) {
    const loadResult = await currentEditor.autoSave.load();
    if (disposed || !loadResult.loaded) return;

    refreshEditorStats(currentEditor);
    logRef.value?.addLog({ message: "已恢复上次编辑的数据", level: "info" });
  }

  return { initializeApp };
}
