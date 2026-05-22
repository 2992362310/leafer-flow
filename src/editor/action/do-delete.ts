import type { IUI } from "leafer";
import { Connector } from "leafer-connector";
import type Editor from "../editor";
import { getConnectorLabelTarget } from "../core/connector-labels";

type ConnectorStateLike = {
  mode?: "node" | "point";
  fromId?: string | number;
  toId?: string | number;
};

export function doDelete(editor: Editor): { success: boolean; message: string } {
  try {
    const list = editor.app.editor.list as IUI[];
    if (!list.length) {
      return {
        success: false,
        message: "未选择元素",
      };
    }

    const targets = collectDeleteTargets(editor, list);
    targets.forEach((element) => {
      element.remove();
    });

    editor.app.editor.cancel();
    editor.history.save();

    return {
      success: true,
      message: `已删除 ${targets.length} 个元素`,
    };
  } catch (error) {
    console.error("执行删除操作时发生错误", error);
    return {
      success: false,
      message: "删除操作失败",
    };
  }
}

function collectDeleteTargets(editor: Editor, selected: IUI[]) {
  const targets = new Set<IUI>(selected);
  const selectedNodeIds = new Set<string | number>();

  selected.forEach((item) => {
    if (!(item instanceof Connector)) {
      selectedNodeIds.add(item.innerId);
    }
  });

  editor.app.tree.children?.forEach((child) => {
    if (child instanceof Connector && isConnectorLinkedToAnyNode(child, selectedNodeIds)) {
      targets.add(child);
    }
  });

  const connectorIds = new Set<string | number>();
  targets.forEach((item) => {
    if (item instanceof Connector) {
      connectorIds.add(item.innerId);
    }
  });

  editor.app.tree.children?.forEach((child) => {
    const connectorId = getConnectorLabelTarget(child);
    if (connectorId && connectorIds.has(connectorId)) {
      targets.add(child);
    }
  });

  return [...targets];
}

function isConnectorLinkedToAnyNode(connector: Connector, nodeIds: Set<string | number>) {
  if (!nodeIds.size) return false;

  try {
    const state = connector.getState() as ConnectorStateLike;
    return Boolean(
      (state.fromId !== undefined && nodeIds.has(state.fromId)) ||
        (state.toId !== undefined && nodeIds.has(state.toId)),
    );
  } catch {
    return false;
  }
}
