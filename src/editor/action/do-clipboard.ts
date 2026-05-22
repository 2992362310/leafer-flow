import { type IUI } from "leafer";
import { Connector } from "leafer-connector";
import type Editor from "../editor";
import {
  getConnectorLabelTarget,
  persistConnectorLabel,
  restoreConnectorLabelRuntimeProps,
  syncConnectorLabels,
} from "../core/connector-labels";
import {
  createConnector,
  remapConnectorState,
  resolveNodeById,
  type ConnectorStateLike,
} from "../core/flow-serialization";

interface ClipboardItem {
  kind: "node" | "connector" | "label";
  originalId?: string | number;
  connectorOriginalId?: string | number;
  connectorState?: ConnectorStateLike;
  json?: Record<string, unknown>;
}

const PASTE_OFFSET = 20;
let clipboard: ClipboardItem[] = [];

export function doCopy(editor: Editor): { success: boolean; message: string } {
  try {
    const selected = (editor.app.editor.list || []) as IUI[];
    if (!selected.length) {
      return { success: false, message: "未选择元素" };
    }

    const selectedSet = new Set<IUI>(selected);
    const selectedNodeIds = new Set<string | number>();
    const copiedConnectorIds = new Set<string | number>();
    const items: ClipboardItem[] = [];

    selected.forEach((el) => {
      if (el instanceof Connector) return;

      const json = el.toJSON() as Record<string, unknown>;
      persistConnectorLabel(el, json);
      items.push({ kind: "node", originalId: el.innerId, json });
      selectedNodeIds.add(el.innerId);
    });

    editor.app.tree.children?.forEach((child) => {
      if (!(child instanceof Connector)) return;

      const state = child.getState() as ConnectorStateLike;
      const selectedConnector = selectedSet.has(child);
      const linksSelectedNodes =
        state.mode === "node" &&
        state.fromId !== undefined &&
        state.toId !== undefined &&
        selectedNodeIds.has(state.fromId) &&
        selectedNodeIds.has(state.toId);

      if (!selectedConnector && !linksSelectedNodes) return;

      items.push({
        kind: "connector",
        originalId: child.innerId,
        connectorState: structuredClone(state),
      });
      copiedConnectorIds.add(child.innerId);
    });

    selected.forEach((el) => {
      const connectorId = getConnectorLabelTarget(el);
      if (connectorId) copiedConnectorIds.add(connectorId);
    });

    editor.app.tree.children?.forEach((child) => {
      const connectorId = getConnectorLabelTarget(child);
      if (!connectorId || !copiedConnectorIds.has(connectorId)) return;

      const json = child.toJSON() as Record<string, unknown>;
      persistConnectorLabel(child, json);
      items.push({
        kind: "label",
        connectorOriginalId: connectorId,
        json,
      });
    });

    clipboard = items;
    return { success: true, message: `已复制 ${clipboard.length} 个元素` };
  } catch (error) {
    console.error("复制时发生错误", error);
    return {
      success: false,
      message: "复制失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

export function doPaste(editor: Editor): { success: boolean; message: string } {
  try {
    if (!clipboard.length) {
      return { success: false, message: "剪贴板为空" };
    }

    const idMap = new Map<string | number, IUI>();
    const connectorMap = new Map<string | number, Connector>();
    let count = 0;

    clipboard.forEach((item) => {
      if (item.kind !== "node" || !item.json) return;

      const data = offsetJsonPosition(item.json);
      editor.app.tree.add(data as object);
      const added = editor.app.tree.children?.[editor.app.tree.children.length - 1] as IUI | undefined;
      restoreConnectorLabelRuntimeProps(added, data);
      if (added && item.originalId !== undefined) {
        idMap.set(item.originalId, added);
      }
      count++;
    });

    clipboard.forEach((item) => {
      if (item.kind !== "connector" || !item.connectorState) return;

      const state = remapConnectorState(item.connectorState, idMap, PASTE_OFFSET);
      if (!state) return;

      const connector = createConnector(editor.app);
      editor.app.tree.add(connector);
      try {
        connector.setState(state as never, (id: string | number) => resolveNodeById(editor.app, id));
      } catch (e) {
        console.warn("粘贴 Connector 状态恢复失败", e);
        if (state.fromPoint && state.toPoint) {
          connector.setPoints(state.fromPoint, state.toPoint);
        }
      }

      if (item.originalId !== undefined) {
        connectorMap.set(item.originalId, connector);
      }
      count++;
    });

    clipboard.forEach((item) => {
      if (item.kind !== "label" || !item.json || item.connectorOriginalId === undefined) return;

      const connector = connectorMap.get(item.connectorOriginalId);
      if (!connector) return;

      const data = offsetJsonPosition(item.json);
      data.__connectorLabelFor = connector.innerId;
      editor.app.tree.add(data as object);
      const added = editor.app.tree.children?.[editor.app.tree.children.length - 1] as IUI | undefined;
      restoreConnectorLabelRuntimeProps(added, data);
      count++;
    });

    syncConnectorLabels(editor.app);
    editor.history.save();
    editor.autoSave.save();

    return { success: true, message: `已粘贴 ${count} 个元素` };
  } catch (error) {
    console.error("粘贴时发生错误", error);
    return {
      success: false,
      message: "粘贴失败: " + (error instanceof Error ? error.message : "未知错误"),
    };
  }
}

function offsetJsonPosition(json: Record<string, unknown>) {
  const data = structuredClone(json);
  if (typeof data.x === "number") data.x += PASTE_OFFSET;
  if (typeof data.y === "number") data.y += PASTE_OFFSET;
  return data;
}
