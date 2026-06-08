import type { Ref } from "vue";
import { WatchEvent } from "leafer";
import { initEditor, type Editor } from "@/editor";

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
  function initializeApp() {
    if (!editorElement.value) return;

    editor.value = initEditor(editorElement.value);
    refreshRuntimeToolContributions(editor.value);
    bindSelectionMarquee(editor.value);
    bindShapeDrop(editor.value);

    editor.value.app.tree.on(WatchEvent.DATA, () => {
      if (!editor.value) return;
      refreshEditorStats(editor.value);
    });

    restoreAutosave(editor.value);
    logRef.value?.addLog({ message: "应用初始化完成", level: "success" });
  }

  function restoreAutosave(currentEditor: Editor) {
    const loadResult = currentEditor.autoSave.load();
    if (!loadResult.loaded) return;

    refreshEditorStats(currentEditor);
    currentEditor.commitMutation({ autoSave: false });
    logRef.value?.addLog({ message: "已恢复上次编辑的数据", level: "info" });
    if (loadResult.failedConnectors > 0) {
      logRef.value?.addLog({
        message: `${loadResult.failedConnectors} 条连接线恢复节点绑定失败，已转为浮动线段`,
        level: "warning",
      });
    }
  }

  return { initializeApp };
}
