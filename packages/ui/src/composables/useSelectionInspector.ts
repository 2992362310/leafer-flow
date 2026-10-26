import { computed, onUnmounted, shallowRef, watch, type Ref } from "vue";
import { Text, type IUI } from "leafer";
import { Connector } from "@leafer-flow/core/core/connector";
import { EditorEvent } from "leafer-editor";
import type { Editor } from "@leafer-flow/core";
import { getConnectorLabelTarget } from "@leafer-flow/core/core/connector-labels";

export interface SelectionInspectorOptions {
  editor: Ref<Editor | undefined>;
}

export function useSelectionInspector(options: SelectionInspectorOptions) {
  const selectedElement = shallowRef<IUI | null>(null);
  const selectedElements = shallowRef<IUI[]>([]);
  const selectedShape = shallowRef<IUI | null>(null);
  const selectedText = shallowRef<Text | null>(null);
  const selectedConnector = shallowRef<Connector | null>(null);
  const selectedConnectorLabel = shallowRef(false);

  const isMultiSelection = computed(() => selectedElements.value.length > 1);
  const hasSelection = computed(() => Boolean(selectedElement.value));
  const hasSelectedConnector = computed(() =>
    selectedElements.value.some((el) => el instanceof Connector),
  );

  let cleanups: (() => void)[] = [];

  function cleanupListeners() {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
  }

  function onSelect(e: EditorEvent) {
    const list = (e.editor.list || []) as IUI[];
    selectedElements.value = [...list];
    selectedElement.value = list[0] || null;
    selectedConnectorLabel.value = Boolean(
      selectedElement.value && getConnectorLabelTarget(selectedElement.value),
    );
    resolveSelectedParts();
  }

  function resolveSelectedParts() {
    const el = selectedElement.value;
    selectedShape.value = null;
    selectedText.value = null;
    selectedConnector.value = null;
    if (!el) return;

    if (el instanceof Connector) {
      selectedConnector.value = el;
      selectedShape.value = el;
      return;
    }

    if (el instanceof Text) {
      selectedText.value = el;
      selectedShape.value = el;
      return;
    }

    const children = getChildren(el);
    if (el.tag === "Group" && children?.length) {
      selectedShape.value =
        children.find((child) => !(child instanceof Text)) || children[0] || null;
      selectedText.value =
        (children.find((child) => child instanceof Text) as Text | undefined) || null;
      return;
    }

    selectedShape.value = el;
  }

  function refreshSelection() {
    const ed = options.editor.value;
    if (!ed?.app?.editor) return;
    const list = (ed.app.editor.list || []) as IUI[];
    selectedElements.value = [...list];
    selectedElement.value = list[0] || null;
    selectedConnectorLabel.value = Boolean(
      selectedElement.value && getConnectorLabelTarget(selectedElement.value),
    );
    resolveSelectedParts();
  }

  watch(
    () => options.editor.value,
    (newEditor) => {
      cleanupListeners();
      if (!newEditor?.app?.editor) return;

      const editorPlugin = newEditor.app.editor;
      editorPlugin.on(EditorEvent.SELECT, onSelect);
      cleanups = [() => editorPlugin.off(EditorEvent.SELECT, onSelect)];
    },
    { immediate: true },
  );

  onUnmounted(cleanupListeners);

  return {
    selectedElement,
    selectedElements,
    selectedShape,
    selectedText,
    selectedConnector,
    selectedConnectorLabel,
    isMultiSelection,
    hasSelection,
    hasSelectedConnector,
    refreshSelection,
  };
}

function getChildren(element: IUI) {
  return (element as unknown as { children?: IUI[] }).children;
}
