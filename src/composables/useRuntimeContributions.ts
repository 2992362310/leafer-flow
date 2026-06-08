import { ref } from "vue";
import type { Editor } from "@/editor";
import { TOOL_NAME } from "@/editor/constants";
import type { ShapeLibraryGroup } from "@/editor/shape-library";
import type { ToolToolbarGroup } from "@/editor/api/tool";
import type { ActionButtonGroupContribution } from "@/editor/api/action-button";
import type { ViewControlContribution } from "@/editor/api/view-control";

export function useRuntimeContributions() {
  const shapeLibraryGroups = ref<ShapeLibraryGroup[]>([]);
  const toolbarGroups = ref<ToolToolbarGroup[]>([]);
  const actionButtonGroups = ref<ActionButtonGroupContribution[]>([]);
  const viewControls = ref<ViewControlContribution[]>([]);
  const toolLabels = ref<Record<string, string>>({ [TOOL_NAME.SELECT]: "选择" });
  const toolShortcuts = ref<Record<string, string>>({});

  function refresh(currentEditor: Editor) {
    refreshShapeLibraryGroups(currentEditor);
    refreshToolbarGroups(currentEditor);
    refreshActionButtonGroups(currentEditor);
    refreshViewControls(currentEditor);
    refreshToolLabels(currentEditor);
    refreshToolShortcuts(currentEditor);
  }

  function refreshShapeLibraryGroups(currentEditor: Editor) {
    shapeLibraryGroups.value = currentEditor.toolRegistry.getShapeLibraryGroups();
  }

  function refreshToolbarGroups(currentEditor: Editor) {
    toolbarGroups.value = currentEditor.toolRegistry.getToolbarGroups();
  }

  function refreshActionButtonGroups(currentEditor: Editor) {
    actionButtonGroups.value = currentEditor.actionButtons.list();
  }

  function refreshViewControls(currentEditor: Editor) {
    viewControls.value = currentEditor.viewControls.list();
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

  function findShapeItem(tool: string) {
    for (const group of shapeLibraryGroups.value) {
      const item = group.items.find((entry) => entry.tool === tool);
      if (item) return item;
    }
    return undefined;
  }

  return {
    shapeLibraryGroups,
    toolbarGroups,
    actionButtonGroups,
    viewControls,
    toolLabels,
    toolShortcuts,
    refresh,
    findShapeItem,
  };
}
