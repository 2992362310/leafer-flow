import { Text, type App, type IUI } from "leafer";
import { Connector } from "leafer-connector";

export const CONNECTOR_LABEL_PROP = "__connectorLabelFor";
export const CONNECTOR_LABEL_OFFSET_X_PROP = "__connectorLabelOffsetX";
export const CONNECTOR_LABEL_OFFSET_Y_PROP = "__connectorLabelOffsetY";

type ConnectorLabel = Text & {
  [CONNECTOR_LABEL_PROP]?: string | number;
  [CONNECTOR_LABEL_OFFSET_X_PROP]?: number;
  [CONNECTOR_LABEL_OFFSET_Y_PROP]?: number;
};

export function getConnectorLabelTarget(label: IUI): string | number | undefined {
  const connectorLabel = label as ConnectorLabel;
  return connectorLabel[CONNECTOR_LABEL_PROP];
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
    around: "white",
    name: "连接线标签",
  }) as ConnectorLabel;

  label[CONNECTOR_LABEL_PROP] = connector.innerId;
  label[CONNECTOR_LABEL_OFFSET_X_PROP] = 0;
  label[CONNECTOR_LABEL_OFFSET_Y_PROP] = 0;
  return label;
}

export function syncConnectorLabels(app: App) {
  const { connectors, labels } = collectConnectorLabels(app);

  labels.forEach((label) => {
    const connectorId = label[CONNECTOR_LABEL_PROP];
    if (!connectorId) return;

    const connector = connectors.get(connectorId);
    if (!connector) return;

    const center = getConnectorCenter(connector);
    const offsetX = label[CONNECTOR_LABEL_OFFSET_X_PROP] || 0;
    const offsetY = label[CONNECTOR_LABEL_OFFSET_Y_PROP] || 0;
    label.x = center.x + offsetX - (label.width || 36) / 2;
    label.y = center.y + offsetY - (label.height || 20) / 2;
  });
}

export function captureSelectedConnectorLabelOffsets(app: App) {
  const selected = (app.editor?.list || []) as IUI[];
  if (!selected.length) return;

  const { connectors } = collectConnectorLabels(app);
  selected.forEach((item) => {
    const label = item as ConnectorLabel;
    if (!(label instanceof Text) || !label[CONNECTOR_LABEL_PROP]) return;

    const connector = connectors.get(label[CONNECTOR_LABEL_PROP]);
    if (!connector) return;

    const center = getConnectorCenter(connector);
    const labelCenterX = (label.x || 0) + (label.width || 36) / 2;
    const labelCenterY = (label.y || 0) + (label.height || 20) / 2;
    label[CONNECTOR_LABEL_OFFSET_X_PROP] = labelCenterX - center.x;
    label[CONNECTOR_LABEL_OFFSET_Y_PROP] = labelCenterY - center.y;
  });
}

export function persistConnectorLabel(child: IUI, json: Record<string, unknown>) {
  const label = child as ConnectorLabel;
  if (label instanceof Text && label[CONNECTOR_LABEL_PROP]) {
    json[CONNECTOR_LABEL_PROP] = label[CONNECTOR_LABEL_PROP];
    json[CONNECTOR_LABEL_OFFSET_X_PROP] = label[CONNECTOR_LABEL_OFFSET_X_PROP] || 0;
    json[CONNECTOR_LABEL_OFFSET_Y_PROP] = label[CONNECTOR_LABEL_OFFSET_Y_PROP] || 0;
  }
}

export function restoreConnectorLabelRuntimeProps(
  node: IUI | undefined,
  data: Record<string, unknown>,
) {
  if (!node || !data[CONNECTOR_LABEL_PROP]) return;

  const label = node as ConnectorLabel;
  label[CONNECTOR_LABEL_PROP] = data[CONNECTOR_LABEL_PROP] as string | number;
  label[CONNECTOR_LABEL_OFFSET_X_PROP] =
    typeof data[CONNECTOR_LABEL_OFFSET_X_PROP] === "number"
      ? data[CONNECTOR_LABEL_OFFSET_X_PROP]
      : 0;
  label[CONNECTOR_LABEL_OFFSET_Y_PROP] =
    typeof data[CONNECTOR_LABEL_OFFSET_Y_PROP] === "number"
      ? data[CONNECTOR_LABEL_OFFSET_Y_PROP]
      : 0;
}

export function findSelectedConnector(list: IUI[]): Connector | null {
  for (const item of list) {
    if (item instanceof Connector) return item;
  }
  return null;
}

function collectConnectorLabels(app: App) {
  const connectors = new Map<string | number, Connector>();
  const labels: ConnectorLabel[] = [];

  app.tree.children?.forEach((child) => {
    if (child instanceof Connector) {
      connectors.set(child.innerId, child);
      return;
    }

    const label = child as ConnectorLabel;
    if (label instanceof Text && label[CONNECTOR_LABEL_PROP]) {
      labels.push(label);
    }
  });

  return { connectors, labels };
}

function getConnectorCenter(connector: Connector) {
  try {
    const wirePath = connector.wire?.path;
    if (typeof wirePath === "string" && wirePath) {
      const mid = sampleSvgPathMid(wirePath);
      if (mid) return mid;
    }
  } catch {
    // wire.path not available, fall through to getPoints
  }

  const points = connector.getPoints();
  if (points?.from && points?.to) {
    return {
      x: (points.from.x + points.to.x) / 2,
      y: (points.from.y + points.to.y) / 2,
    };
  }

  const bounds = connector.getBounds("box", "page");
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

type IPoint = { x: number; y: number };

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

  if (commands.length === 1) {
    const cmd = commands[0];
    if (cmd.type === "L" && cmd.args.length === 4) {
      return { x: (cmd.args[0] + cmd.args[2]) / 2, y: (cmd.args[1] + cmd.args[3]) / 2 };
    }
  }

  // Collect all segment lengths and total length for polyline (M/L only)
  const isAllLinear = commands.every((c) => c.type === "L" || c.type === "M");
  if (isAllLinear) {
    const vertices: IPoint[] = [];
    for (const cmd of commands) {
      if (cmd.type === "M" || cmd.type === "L") {
        vertices.push({ x: cmd.args[0], y: cmd.args[1] });
      }
    }
    if (vertices.length < 2) return null;

    // Find the midpoint along the polyline
    let totalLen = 0;
    const segLens: number[] = [];
    for (let i = 1; i < vertices.length; i++) {
      const dx = vertices[i].x - vertices[i - 1].x;
      const dy = vertices[i].y - vertices[i - 1].y;
      const len = Math.hypot(dx, dy);
      segLens.push(len);
      totalLen += len;
    }

    if (totalLen === 0) return vertices[Math.floor(vertices.length / 2)];

    const halfLen = totalLen / 2;
    let accumulated = 0;
    for (let i = 0; i < segLens.length; i++) {
      if (accumulated + segLens[i] >= halfLen) {
        const remaining = halfLen - accumulated;
        const t = segLens[i] > 0 ? remaining / segLens[i] : 0;
        return {
          x: vertices[i].x + t * (vertices[i + 1].x - vertices[i].x),
          y: vertices[i].y + t * (vertices[i + 1].y - vertices[i].y),
        };
      }
      accumulated += segLens[i];
    }
    return vertices[vertices.length - 1];
  }

  // For bezier curves (C/Q), sample at t=0.5
  const firstCmd = commands[0];
  if (firstCmd.type === "M") {
    // Start from first command
  }

  // Collect points to determine segments
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
    // Quadratic bezier at t=0.5: B(t) = (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
    const p0 = { x: pts[0], y: pts[1] };
    const p1 = { x: pts[2], y: pts[3] };
    const p2 = { x: pts[4], y: pts[5] };
    return {
      x: 0.25 * p0.x + 0.5 * p1.x + 0.25 * p2.x,
      y: 0.25 * p0.y + 0.5 * p1.y + 0.25 * p2.y,
    };
  }

  // Fallback: bounding box center
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
