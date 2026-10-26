import type { Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Editor } from "@leafer-flow/core";
import { canUseTemplateAction } from "../../../editor/plugins/market/plugin-market-service";

type LogLevel = "info" | "success" | "warning" | "error";

interface EditorLogRef {
  addLog(options: { message: string; level?: LogLevel; command?: string }): void;
}

interface UseTemplateRouteOptions {
  editor: Ref<Editor | undefined>;
  logRef: Ref<EditorLogRef | null>;
}

export function useTemplateRoute({ editor, logRef }: UseTemplateRouteOptions) {
  const route = useRoute();
  const router = useRouter();

  async function handleTemplateFromRoute() {
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

  return { handleTemplateFromRoute };
}
