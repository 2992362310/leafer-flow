<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Editor } from "@/editor";
import { canUseTemplateAction } from "@/editor/plugins/market/plugin-market-service";
import EditorLog from "@/components/EditorLog.vue";
import PanelDockRail from "@/components/PanelDockRail.vue";
import {
  EditorPageBottomHud,
  EditorPageCanvasAssistLayer,
  EditorPageOverlayHost,
  EditorPageSidePanels,
  EditorPageToolbarShell,
} from "@/views/editor-page/components";
import { useEditorPageLogicRegistry, useEditorPageState } from "@/views/editor-page";

type LogLevel = "info" | "success" | "warning" | "error";

interface RuntimeLogApi {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

const route = useRoute();
const router = useRouter();
const editorRef = useTemplateRef("editorRef");
const logRef = useTemplateRef<RuntimeLogApi>("logRef");
const editor = shallowRef<Editor>();

const state = useEditorPageState();
const {
  cleanupAll,
} = state;

const {
  initializeApp,
  bindEvents,
} = useEditorPageLogicRegistry({
  editor,
  editorElement: editorRef,
  logRef,
  state,
});

onMounted(() => {
  initializeApp();

  void handleTemplateActionFromRoute();

  bindEvents();
});

onUnmounted(() => {
  cleanupAll();
});

async function handleTemplateActionFromRoute() {
  const templateAction = route.query.template as string | undefined;
  if (!templateAction) return;

  const currentEditor = editor.value;
  if (!currentEditor) return;

  if (!canUseTemplateAction(templateAction)) {
    router.replace({ path: "/template-market" });
    logRef.value?.addLog({ message: "该模板尚未购买", level: "warning" });
    return;
  }

  await currentEditor.commands.execute(templateAction);
  router.replace({ path: "/" });
  logRef.value?.addLog({ message: "模板已插入", level: "success" });
}

</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>
  <EditorLog ref="logRef" />
  <PanelDockRail />

  <EditorPageCanvasAssistLayer :editor="editor" :state="state" />
  <EditorPageToolbarShell :editor="editor" :state="state" />
  <EditorPageSidePanels :editor="editor" :state="state" />
  <EditorPageBottomHud :editor="editor" :state="state" />
  <EditorPageOverlayHost :editor="editor" :state="state" />
</template>
