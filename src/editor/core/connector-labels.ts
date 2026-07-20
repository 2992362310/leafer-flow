import { Text, type App, type IUI } from "leafer";
import { Connector } from "./connector";

export const CONNECTOR_LABEL_PROP = "__connectorLabelFor";
export const CONNECTOR_LABEL_OFFSET_X_PROP = "__connectorLabelOffsetX";
export const CONNECTOR_LABEL_OFFSET_Y_PROP = "__connectorLabelOffsetY";

type ConnectorLabel = IUI & {
  [CONNECTOR_LABEL_PROP]?: string | number;
  [CONNECTOR_LABEL_OFFSET_X_PROP]?: number;
  [CONNECTOR_LABEL_OFFSET_Y_PROP]?: number;
  text?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

export function getConnectorLabelTarget(label: IUI): string | number | undefined {
  return readLabelProp(label, CONNECTOR_LABEL_PROP);
}

export function createConnectorLabel(connector: Connector): ConnectorLabel {
  const position = getConnectorCenter(connector);
  const label = new Text({
    x: position.x - 18,
    y: position.y - 10,
    width: 36,
    height: 20,
    text: "标签",
    editable: true,
    fill: "#1f2937",
    fontSize: 12,
    textAlign: "center",
    verticalAlign: "middle",
    padding: 2,
    boxStyle: { fill: "#ffffff" },
    name: "连接线标签",
  }) as ConnectorLabel;

  bindConnectorLabel(connector, label);
  return label;
}

/** Bind label ↔ connector for live follow during connector.update(). */
export function bindConnectorLabel(connector: Connector, label: IUI) {
  const id = String(connector.innerId);
  writeLabelProp(label, CONNECTOR_LABEL_PROP, id);
  if (readLabelProp(label, CONNECTOR_LABEL_OFFSET_X_PROP) == null) {
    writeLabelProp(label, CONNECTOR_LABEL_OFFSET_X_PROP, 0);
  }
  if (readLabelProp(label, CONNECTOR_LABEL_OFFSET_Y_PROP) == null) {
    writeLabelProp(label, CONNECTOR_LABEL_OFFSET_Y_PROP, 0);
  }
  connector.attachLabel(label);
}

export function syncConnectorLabels(app: App, only?: Connector) {
  rebindConnectorLabelsFromTree(app);

  if (only) {
    only.syncAttachedLabels();
    return;
  }

  app.tree.children?.forEach((child) => {
    if (child instanceof Connector) child.syncAttachedLabels();
  });
}

export function captureSelectedConnectorLabelOffsets(app: App) {
  const selected = (app.editor?.list || []) as IUI[];
  if (!selected.length) return;

  const { connectors } = collectConnectorLabels(app);
  selected.forEach((item) => {
    const connectorId = readLabelProp(item, CONNECTOR_LABEL_PROP);
    if (connectorId == null) return;

    const connector = resolveConnector(connectors, connectorId);
    if (!connector) return;

    const center = getConnectorCenter(connector);
    const label = item as ConnectorLabel;
    const labelCenterX = (label.x || 0) + (label.width || 36) / 2;
    const labelCenterY = (label.y || 0) + (label.height || 20) / 2;
    writeLabelProp(label, CONNECTOR_LABEL_OFFSET_X_PROP, labelCenterX - center.x);
    writeLabelProp(label, CONNECTOR_LABEL_OFFSET_Y_PROP, labelCenterY - center.y);
  });
}

export function persistConnectorLabel(child: IUI, json: Record<string, unknown>) {
  const connectorId = readLabelProp(child, CONNECTOR_LABEL_PROP);
  if (connectorId == null) return;

  json[CONNECTOR_LABEL_PROP] = connectorId;
  json[CONNECTOR_LABEL_OFFSET_X_PROP] = readLabelProp(child, CONNECTOR_LABEL_OFFSET_X_PROP) || 0;
  json[CONNECTOR_LABEL_OFFSET_Y_PROP] = readLabelProp(child, CONNECTOR_LABEL_OFFSET_Y_PROP) || 0;
}

export function restoreConnectorLabelRuntimeProps(
  node: IUI | undefined,
  data: Record<string, unknown>,
) {
  if (!node || data[CONNECTOR_LABEL_PROP] == null) return;

  writeLabelProp(node, CONNECTOR_LABEL_PROP, data[CONNECTOR_LABEL_PROP] as string | number);
  writeLabelProp(
    node,
    CONNECTOR_LABEL_OFFSET_X_PROP,
    typeof data[CONNECTOR_LABEL_OFFSET_X_PROP] === "number" ? data[CONNECTOR_LABEL_OFFSET_X_PROP] : 0,
  );
  writeLabelProp(
    node,
    CONNECTOR_LABEL_OFFSET_Y_PROP,
    typeof data[CONNECTOR_LABEL_OFFSET_Y_PROP] === "number" ? data[CONNECTOR_LABEL_OFFSET_Y_PROP] : 0,
  );
}

/** After load/remap, re-attach labels to live Connector instances. */
export function rebindConnectorLabelsFromTree(app: App) {
  const { connectors, labels } = collectConnectorLabels(app);
  labels.forEach((label) => {
    const connectorId = readLabelProp(label, CONNECTOR_LABEL_PROP);
    if (connectorId == null) return;
    const connector = resolveConnector(connectors, connectorId);
    if (connector) connector.attachLabel(label);
  });
}

export function findSelectedConnector(list: IUI[]): Connector | null {
  for (const item of list) {
    const connector = findOwningConnector(item);
    if (connector) return connector;
  }
  return null;
}

function findOwningConnector(item: IUI): Connector | null {
  if (item instanceof Connector) return item;

  let current = item.parent as IUI | undefined;
  while (current) {
    if (current instanceof Connector) return current;
    current = current.parent as IUI | undefined;
  }

  return null;
}

function collectConnectorLabels(app: App) {
  const connectors = new Map<string | number, Connector>();
  const labels: ConnectorLabel[] = [];

  app.tree.children?.forEach((child) => {
    if (child instanceof Connector) {
      connectors.set(child.innerId, child);
      connectors.set(String(child.innerId), child);
      return;
    }

    // Do not rely on `instanceof Text` (duplicate leafer copies break it).
    if (readLabelProp(child, CONNECTOR_LABEL_PROP) != null || child.name === "连接线标签") {
      labels.push(child as ConnectorLabel);
    }
  });

  return { connectors, labels };
}

function resolveConnector(
  connectors: Map<string | number, Connector>,
  connectorId: string | number,
) {
  return (
    connectors.get(connectorId) ||
    connectors.get(String(connectorId)) ||
    (typeof connectorId === "string" && connectorId !== ""
      ? connectors.get(Number(connectorId))
      : undefined)
  );
}

function readLabelProp(target: IUI, key: string): string | number | undefined {
  const direct = (target as unknown as Record<string, unknown>)[key];
  if (direct !== undefined && direct !== null) return direct as string | number;
  const data = (target as unknown as { __?: Record<string, unknown> }).__;
  const nested = data?.[key];
  if (nested !== undefined && nested !== null) return nested as string | number;
  return undefined;
}

function writeLabelProp(target: IUI, key: string, value: string | number) {
  (target as unknown as Record<string, unknown>)[key] = value;
  const data = (target as unknown as { __?: Record<string, unknown> }).__;
  if (data && typeof data === "object") {
    data[key] = value;
  }
}

function getConnectorCenter(connector: Connector) {
  const routeCenter = getPolylineMidpoint(connector.getRoutePoints());
  if (routeCenter) return routeCenter;

  const points = connector.getPoints();
  if (points?.from && points?.to) {
    return {
      x: (points.from.x + points.to.x) / 2,
      y: (points.from.y + points.to.y) / 2,
    };
  }

  try {
    const wirePath = connector.wire?.path;
    if (typeof wirePath === "string" && wirePath) {
      const mid = sampleSvgPathMid(wirePath);
      if (mid) return mid;
    }
  } catch {
    // wire.path not available
  }

  try {
    const bounds = connector.getBounds("box", "page");
    if (
      bounds &&
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height)
    ) {
      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
    }
  } catch {
    // ignore Layouter errors
  }

  return { x: 0, y: 0 };
}

type IPoint = { x: number; y: number };

function getPolylineMidpoint(points: IPoint[]): IPoint | null {
  if (points.length < 2) return null;

  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) return points[Math.floor(points.length / 2)];

  const halfLength = totalLength / 2;
  let accumulated = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i];
    if (accumulated + segmentLength >= halfLength) {
      const t = segmentLength > 0 ? (halfLength - accumulated) / segmentLength : 0;
      return {
        x: points[i].x + t * (points[i + 1].x - points[i].x),
        y: points[i].y + t * (points[i + 1].y - points[i].y),
      };
    }
    accumulated += segmentLength;
  }

  return points[points.length - 1];
}

function cubicBezierPoint(p0: IPoint, p1: IPoint, p2: IPoint, p3: IPoint, t: number): IPoint {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function sampleSvgPathMid(d: string): IPoint | null {
  const commands = parseSvgPath(d);
  if (!commands.length) return null;

  const isAllLinear = commands.every((c) => c.type === "L" || c.type === "M");
  if (isAllLinear) {
    const vertices: IPoint[] = [];
    for (const cmd of commands) {
      if (cmd.type === "M" || cmd.type === "L") {
        vertices.push({ x: cmd.args[0], y: cmd.args[1] });
      }
    }
    return getPolylineMidpoint(vertices);
  }

  const firstCmd = commands[0];
  const pts: number[] = [];
  for (const cmd of commands) {
    pts.push(...cmd.args);
  }

  if (
    firstCmd.type === "M" &&
    commands.length === 2 &&
    commands[1].type === "C" &&
    pts.length === 10
  ) {
    return cubicBezierPoint(
      { x: pts[0], y: pts[1] },
      { x: pts[2], y: pts[3] },
      { x: pts[4], y: pts[5] },
      { x: pts[6], y: pts[7] },
      0.5,
    );
  }

  if (
    firstCmd.type === "M" &&
    commands.length === 2 &&
    commands[1].type === "Q" &&
    pts.length === 8
  ) {
    const p0 = { x: pts[0], y: pts[1] };
    const p1 = { x: pts[2], y: pts[3] };
    const p2 = { x: pts[4], y: pts[5] };
    return {
      x: 0.25 * p0.x + 0.5 * p1.x + 0.25 * p2.x,
      y: 0.25 * p0.y + 0.5 * p1.y + 0.25 * p2.y,
    };
  }

  return null;
}

function parseSvgPath(d: string): { type: string; args: number[] }[] {
  const result: { type: string; args: number[] }[] = [];
  const regex =
    /([MLCQHVZmlcqhvz])\s*((?:[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?\s*(?:[, ]\s*)?)*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(d)) !== null) {
    const type = match[1].toUpperCase();
    const argsStr = match[2].trim();
    const args = argsStr
      ? argsStr
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number)
      : [];
    result.push({ type, args });
  }

  return result;
}
