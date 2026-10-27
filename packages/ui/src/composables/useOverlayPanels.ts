import { shallowRef, watch, type Ref } from "vue";
import type { Editor } from "@leafer-flow/core";
import type { OverlayPanelContribution } from "@leafer-flow/core/api/overlay-panel";

export function useOverlayPanels(editor: Ref<Editor | undefined>) {
    const panels = shallowRef<OverlayPanelContribution[]>([]);
    watch(editor, (current, _previous, onCleanup) => {
        if (!current) {
            panels.value = [];
            return;
        }
        const refresh = () => { panels.value = current.overlayPanels.list(); };
        refresh();
        const unsubscribe = current.overlayPanels.subscribe(refresh);
        onCleanup(unsubscribe);
    }, { immediate: true, flush: "sync" });
    return panels;
}
