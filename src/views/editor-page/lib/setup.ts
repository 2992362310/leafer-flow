import type { Ref } from "vue";
import type { Editor } from "@/editor";
import { useRuntimeContributions } from "@/composables/useRuntimeContributions";
import { useSelectionMarquee } from "@/composables/useSelectionMarquee";
import { useShapeDrop } from "@/composables/useShapeDrop";
import { useEditorCommands } from "@/composables/useEditorCommands";
import { useEditorAppInit } from "@/composables/useEditorAppInit";
import { usePageEvents } from "@/composables/usePageEvents";
import type { PanelVisibility } from "./panel-visibility";
import type { PageState } from "./state";

type LogLevel = "info" | "success" | "warning" | "error";

interface EditorLogRef {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

interface UsePageSetupOptions {
  editor: Ref<Editor | undefined>;
  editorElement: Ref<HTMLElement | null>;
  logRef: Ref<EditorLogRef | null>;
  state: PageState;
  panelVisibility: PanelVisibility;
}

export function usePageSetup(options: UsePageSetupOptions) {
  const runtime = useRuntimeContributions();

  const { resetToSelectTool } = useEditorCommands({
    editor: options.editor,
    logRef: options.logRef,
    activeTool: options.state.activeTool,
    toolShortcuts: runtime.toolShortcuts,
    refreshEditorStats: options.state.refreshEditorStats,
  });

  const { bind: bindSelectionMarquee } = useSelectionMarquee({
    editor: options.editor,
    selectedTool: options.state.activeTool,
    marquee: options.state.marquee,
    addCleanup: options.state.addCleanup,
    onLog: (message, level) => options.logRef.value?.addLog({ message, level }),
  });

  const { bind: bindShapeDrop } = useShapeDrop({
    editor: options.editor,
    editorElement: options.editorElement,
    addCleanup: options.state.addCleanup,
    onCreated: () => {
      if (options.editor.value) options.state.refreshEditorStats(options.editor.value);
    },
    onLog: (message, level) => options.logRef.value?.addLog({ message, level }),
  });

  const { initializeApp } = useEditorAppInit({
    editor: options.editor,
    editorElement: options.editorElement,
    logRef: options.logRef,
    refreshRuntimeToolContributions: runtime.refresh,
    bindSelectionMarquee,
    bindShapeDrop,
    refreshEditorStats: options.state.refreshEditorStats,
  });

  const { bindEvents } = usePageEvents({
    editor: options.editor,
    togglePanel: options.panelVisibility.toggle,
    openPanel: options.panelVisibility.open,
    diagramLintIssues: options.state.diagramLintIssues,
    diagramLintGeneratedAt: options.state.diagramLintGeneratedAt,
    addCleanup: options.state.addCleanup,
  });

  function handlePluginMarketChanged() {
    const currentEditor = options.editor.value;
    if (!currentEditor) return;

    runtime.refresh(currentEditor);
    resetToSelectTool();
    options.logRef.value?.addLog({ message: "插件状态已更新", level: "success" });
  }

  const onPluginMarketChanged = () => {
    handlePluginMarketChanged();
  };
  window.addEventListener("leafer-flow:plugin-market-changed", onPluginMarketChanged);
  options.state.addCleanup(() => {
    window.removeEventListener("leafer-flow:plugin-market-changed", onPluginMarketChanged);
  });

  return {
    initializeApp,
    bindEvents,
  };
}
