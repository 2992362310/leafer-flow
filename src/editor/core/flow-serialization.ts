import { App, type IUI } from "leafer";
import { Connector } from "leafer-connector";
import {
  CONNECTOR_LABEL_PROP,
  persistConnectorLabel,
  restoreConnectorLabelRuntimeProps,
  syncConnectorLabels,
} from "./connector-labels";
import { normalizeAtomicGroups } from "./group-selection";

export interface SerializedChild {
  __connectorState?: Record<string, unknown>;
  __flowConnectorId?: string | number;
  __flowNodeId?: string | number;
  __isConnector?: boolean;
  [key: string]: unknown;
}

export type ConnectorStateLike = {
  mode?: "node" | "point";
  fromId?: string | number;
  toId?: string | number;
  fromPoint?: { x: number; y: number };
  toPoint?: { x: number; y: number };
  opt1?: Record<string, unknown>;
  opt2?: Record<string, unknown>;
  [key: string]: unknown;
};

export interface DeserializeResult {
  failedConnectors: number;
}

export const CUSTOM_DATA_PROP = "__flowCustomData";
export const FLOW_SERIALIZATION_SCHEMA = "leafer-flow";
export const FLOW_SERIALIZATION_VERSION = 1;

export interface SerializedFlowDocument extends Record<string, unknown> {
  schema: typeof FLOW_SERIALIZATION_SCHEMA;
  version: typeof FLOW_SERIALIZATION_VERSION;
  children: SerializedChild[];
}

export function isSerializedFlowDocument(
  json: Record<string, unknown>,
): json is SerializedFlowDocument {
  const version = json.version;
  return (
    (!json.schema || json.schema === FLOW_SERIALIZATION_SCHEMA) &&
    (!version || version === FLOW_SERIALIZATION_VERSION) &&
    Array.isArray(json.children)
  );
}

export function serializeTreeWithConnectors(app: App): SerializedFlowDocument {
  const json = app.tree.toJSON() as Record<string, unknown>;
  return {
    ...json,
    schema: FLOW_SERIALIZATION_SCHEMA,
    version: FLOW_SERIALIZATION_VERSION,
    children: serializeChildrenWithConnectors(app),
  };
}

export function serializeChildrenWithConnectors(app: App): SerializedChild[] {
  const json = app.tree.toJSON() as Record<string, unknown>;
  const children = ((json.children || []) as SerializedChild[]).map((child) => ({ ...child }));
  const treeChildren = app.tree.children || [];

  for (let i = 0; i < treeChildren.length && i < children.length; i++) {
    const child = treeChildren[i];
    if (child instanceof Connector) {
      const customData = (child as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP];
      children[i] = {
        __isConnector: true,
        __flowConnectorId: child.innerId,
        __connectorState: child.getState() as unknown as Record<string, unknown>,
        ...(customData ? { [CUSTOM_DATA_PROP]: customData } : {}),
      };
      continue;
    }

    children[i].__flowNodeId = child.innerId;
    const customData = (child as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP];
    if (customData) {
      children[i][CUSTOM_DATA_PROP] = customData;
    }
    persistConnectorLabel(child, children[i]);
  }

  return children;
}

export function deserializeTreeWithConnectors(
  app: App,
  json: Record<string, unknown>,
): DeserializeResult {
  if (!isSerializedFlowDocument(json)) {
    throw new Error("不支持的 Leafer Flow 文件格式或版本");
  }

  return applySerializedChildren(app, json.children);
}

export function applySerializedChildren(app: App, children: SerializedChild[]): DeserializeResult {
  let failedConnectors = 0;
  app.tree.clear();
  if (!Array.isArray(children)) return { failedConnectors: 0 };

  const connectors: SerializedChild[] = [];
  const idMap = new Map<string | number, IUI>();
  const connectorMap = new Map<string | number, Connector>();

  children.forEach((child) => {
    if (child.__isConnector) {
      connectors.push(child);
      return;
    }

    app.tree.add(child as object);
    const added = app.tree.children?.[app.tree.children.length - 1] as IUI | undefined;
    if (!added) return;

    if (child.__flowNodeId !== undefined) {
      idMap.set(child.__flowNodeId, added);
    }
    if (added.id !== undefined) {
      idMap.set(added.id, added);
    }
    idMap.set(added.innerId, added);
    if (child[CUSTOM_DATA_PROP]) {
      (added as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP] = child[CUSTOM_DATA_PROP];
    }
    restoreConnectorLabelRuntimeProps(added, child);
  });

  connectors.forEach((child) => {
    const state = remapConnectorState(
      child.__connectorState as ConnectorStateLike | undefined,
      idMap,
    );
    if (!state) return;

    const connector = createConnector(app);
    app.tree.add(connector);

    try {
      connector.setState(state as never, (id: string | number) => resolveNodeById(app, id));
    } catch (e) {
      console.warn("恢复 Connector 状态失败:", e);
      restoreConnectorPoints(connector, state);
      failedConnectors++;
    }

    if (child.__flowConnectorId !== undefined) {
      connectorMap.set(child.__flowConnectorId, connector);
    }

    if (child[CUSTOM_DATA_PROP]) {
      (connector as unknown as Record<string, unknown>)[CUSTOM_DATA_PROP] = child[CUSTOM_DATA_PROP];
    }
  });

  remapConnectorLabels(app, connectorMap);
  normalizeAtomicGroups(app.tree.children as IUI[] | undefined);
  syncConnectorLabels(app);
  return { failedConnectors };
}

export function createConnector(app: App) {
  return new Connector(app, {
    fromPoint: { x: 0, y: 0 },
    toPoint: { x: 0, y: 0 },
    getNodeId: (node: IUI) => String(node.innerId),
  });
}

export function remapConnectorState(
  state: ConnectorStateLike | undefined,
  idMap: Map<string | number, IUI>,
  offset = 0,
): ConnectorStateLike | undefined {
  if (!state) return undefined;

  const next = structuredClone(state) as ConnectorStateLike;
  if (next.mode === "node" && next.fromId !== undefined && next.toId !== undefined) {
    const from = idMap.get(next.fromId);
    const to = idMap.get(next.toId);
    if (from && to) {
      next.fromId = from.innerId;
      next.toId = to.innerId;
      return next;
    }
  }

  next.mode = "point";
  if (next.fromPoint) {
    next.fromPoint = { x: next.fromPoint.x + offset, y: next.fromPoint.y + offset };
  }
  if (next.toPoint) {
    next.toPoint = { x: next.toPoint.x + offset, y: next.toPoint.y + offset };
  }
  return next;
}

export function resolveNodeById(app: App, id: string | number): IUI | undefined {
  const children = app.tree.children;
  if (!children) return undefined;

  for (const child of children) {
    if (matchesNodeId(child, id)) return child;
    if ("children" in child && Array.isArray((child as { children?: unknown }).children)) {
      const found = findNodeInGroup(child as IUI, id);
      if (found) return found;
    }
  }
  return undefined;
}

function restoreConnectorPoints(connector: Connector, state: ConnectorStateLike) {
  if (state.fromPoint && state.toPoint) {
    connector.setPoints(state.fromPoint, state.toPoint);
  }
}

function remapConnectorLabels(app: App, connectorMap: Map<string | number, Connector>) {
  app.tree.children?.forEach((child) => {
    const label = child as IUI & { [CONNECTOR_LABEL_PROP]?: string | number };
    const oldConnectorId = label[CONNECTOR_LABEL_PROP];
    if (oldConnectorId === undefined) return;

    const connector = connectorMap.get(oldConnectorId);
    if (connector) {
      label[CONNECTOR_LABEL_PROP] = connector.innerId;
    }
  });
}

function matchesNodeId(node: IUI, id: string | number) {
  return String(node.innerId) === String(id) || String(node.id) === String(id);
}

function findNodeInGroup(group: IUI, id: string | number): IUI | undefined {
  const children = (group as unknown as { children?: IUI[] }).children;
  if (!children) return undefined;

  for (const child of children) {
    if (matchesNodeId(child, id)) return child;
    if ("children" in child && Array.isArray((child as unknown as { children?: IUI[] }).children)) {
      const found = findNodeInGroup(child, id);
      if (found) return found;
    }
  }
  return undefined;
}
