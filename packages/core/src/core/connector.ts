import {
  Group,
  Path,
  Rect,
  type App,
  type IArrowStyle,
  type IPointData,
  type ITextInputData,
  type IUI,
} from "leafer";
import { FLOW_BOX_SIZE_PROP } from "./flow-node-shape";

export type ConnectorRouteType = "orthogonal" | "bezier" | "straight" | "custom";
export type ConnectorScaleMode = "world" | "pixel";
export type ConnectorSide = "top" | "right" | "bottom" | "left";

export interface TargetOption {
  side?: ConnectorSide | "auto";
  percent?: number;
  padding?: number;
  margin?: number;
  linkPoint?: IPointData;
}

export interface ConnectorPoint {
  node?: IUI;
  side: ConnectorSide;
  percent: number;
  margin: number;
  padding: number;
  linkPoint: IPointData;
  paddingPoint: IPointData;
}

export interface ConnectorDrawResult {
  points: IPointData[];
  path: string;
}

export interface ConnectorState {
  mode: "node" | "point" | "mixed";
  fromId?: string | number;
  toId?: string | number;
  fromPoint?: IPointData;
  toPoint?: IPointData;
  routeType: ConnectorRouteType;
  padding: number;
  margin: number;
  cornerRadius: number;
  bezierCurvature: number;
  opt1?: TargetOption;
  opt2?: TargetOption;
  stroke?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  startArrow?: IArrowStyle;
  endArrow?: IArrowStyle;
  scaleMode?: ConnectorScaleMode;
  arrowBaseScale?: number;
  label?: {
    text?: string;
    editable?: boolean;
    style?: Partial<ITextInputData>;
  };
  waypoints?: IPointData[];
}

type ConnectorEndpoints =
  | { from: IUI; to: IUI; fromPoint?: never; toPoint?: never }
  | { from?: never; to?: never; fromPoint: IPointData; toPoint: IPointData };

export type ConnectorOptions = ConnectorEndpoints & {
  padding?: number;
  margin?: number;
  cornerRadius?: number;
  opt1?: TargetOption;
  opt2?: TargetOption;
  routeType?: ConnectorRouteType;
  bezierCurvature?: number;
  routeOptions?: Record<string, unknown>;
  updateMode?: "event" | "render" | "manual";
  getNodeId?: (node: IUI) => string | number;
  onEndpointEditEnd?: () => void;
  onDraw?: (param: {
    s: ConnectorPoint;
    e: ConnectorPoint;
    defaultResult: ConnectorDrawResult;
  }) => Partial<ConnectorDrawResult> | void;
  stroke?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  startArrow?: IArrowStyle;
  endArrow?: IArrowStyle;
  scaleMode?: ConnectorScaleMode;
  arrowBaseScale?: number;
  label?: ConnectorState["label"];
  pointsEditable?: boolean;
};

type RuntimeOptions = Omit<ConnectorOptions, "from" | "to" | "fromPoint" | "toPoint">;

const DEFAULT_PADDING = 28;
const DEFAULT_MARGIN = 0;
const DEFAULT_CORNER_RADIUS = 10;
const DEFAULT_BEZIER_CURVATURE = 0.45;
const HANDLE_SIZE = 8;
/** Keep in sync with connector-labels.ts (avoid circular import). */
const CONNECTOR_LABEL_OFFSET_X = "__connectorLabelOffsetX";
const CONNECTOR_LABEL_OFFSET_Y = "__connectorLabelOffsetY";

export class Connector extends Group {
  readonly wire: Path;
  readonly hitArea: Path;
  readonly fromHandle: Rect;
  readonly toHandle: Rect;

  private readonly rootApp: App;
  private mode: "node" | "point" | "mixed";
  private fromNode?: IUI;
  private toNode?: IUI;
  private fromPoint?: IPointData;
  private targetPoint?: IPointData;
  private options: RuntimeOptions;
  private lastRoutePoints: IPointData[] = [];
  private cleanupEndpointListeners: (() => void)[] = [];
  private updateScheduled = false;
  private isUpdating = false;
  private waypoints: IPointData[] = [];
  private waypointHandles: Rect[] = [];
  /** Labels that should follow this connector's geometry on every update(). */
  private readonly attachedLabels = new Set<IUI>();

  constructor(app: App, options: ConnectorOptions) {
    super({
      name: "连接线",
      editable: false,
      hittable: true,
      stroke: options.stroke || "#278bfe",
      strokeWidth: options.strokeWidth ?? 2,
      dashPattern: options.dashPattern,
      startArrow: options.startArrow,
      endArrow: options.endArrow,
      cornerRadius: options.cornerRadius ?? DEFAULT_CORNER_RADIUS,
    });
    this.rootApp = app;
    this.options = normalizeOptions(options);
    this.mode = hasNodeEndpoints(options) ? "node" : "point";

    this.hitArea = new Path({
      name: "连接线命中区",
      path: "M 0 0",
      fill: "transparent",
      stroke: "rgba(39, 139, 254, 0.001)",
      strokeWidth: Math.max((this.options.strokeWidth ?? 2) + 10, 12),
      editable: false,
      hittable: true,
    });
    this.wire = new Path({
      name: "连接线主体",
      path: "M 0 0",
      fill: "transparent",
      stroke: this.options.stroke || "#278bfe",
      strokeWidth: this.options.strokeWidth ?? 2,
      dashPattern: this.options.dashPattern,
      startArrow: this.options.startArrow,
      endArrow: this.options.endArrow,
      editable: false,
      hittable: false,
    });
    this.fromHandle = createHandle();
    this.toHandle = createHandle();
    this.hittable = true;
    this.editable = false;
    this.draggable = false;
    this.add([this.hitArea, this.wire, this.fromHandle, this.toHandle]);
    this.bindEndpointHandle(this.fromHandle, "from");
    this.bindEndpointHandle(this.toHandle, "to");

    if (hasNodeEndpoints(options)) {
      this.fromNode = options.from;
      this.toNode = options.to;
      this.bindEndpointListeners();
    } else {
      this.fromPoint = clonePoint(options.fromPoint);
      this.targetPoint = clonePoint(options.toPoint);
    }

    this.update();
  }

  get routeType() {
    return this.options.routeType || "orthogonal";
  }
  set routeType(value: ConnectorRouteType) {
    this.options.routeType = value;
    this.update();
  }

  getRouteCornerRadius() {
    return getNumericProperty(
      this,
      "cornerRadius",
      this.options.cornerRadius ?? DEFAULT_CORNER_RADIUS,
    );
  }

  setRouteCornerRadius(value: number) {
    this.options.cornerRadius = value;
    (this as unknown as { cornerRadius?: number }).cornerRadius = value;
    this.update();
  }

  bind(from: IUI, to: IUI) {
    this.switchToNodeMode(from, to);
  }

  bindPoints(from: IPointData, to: IPointData) {
    this.switchToPointMode(from, to);
  }

  isPointMode() {
    return this.mode === "point";
  }

  isMixedMode() {
    return this.mode === "mixed";
  }

  getPoints() {
    const endpoints = this.resolveEndpoints();
    if (!endpoints) return null;
    return {
      from: clonePoint(endpoints.from.linkPoint),
      to: clonePoint(endpoints.to.linkPoint),
    };
  }

  setEndpointHandlesVisible(visible: boolean) {
    this.fromHandle.visible = visible;
    this.fromHandle.hittable = visible;
    this.toHandle.visible = visible;
    this.toHandle.hittable = visible;
  }

  setPoints(from: IPointData, to: IPointData) {
    this.mode = "point";
    this.fromNode = undefined;
    this.toNode = undefined;
    this.cleanupNodeListeners();
    this.fromPoint = clonePoint(from);
    this.targetPoint = clonePoint(to);
    this.update();
  }

  invalidate() {
    this.update();
  }

  requestUpdate() {
    this.update();
  }

  switchToNodeMode(
    from: IUI,
    to: IUI,
    opts: {
      autoUpdateMode?: boolean;
      updateMode?: "event" | "render" | "manual";
      /** Defer geometry update to the next frame (avoids Layouter races on fresh nodes). */
      defer?: boolean;
    } = {},
  ) {
    this.mode = "node";
    this.fromNode = from;
    this.toNode = to;
    this.fromPoint = undefined;
    this.targetPoint = undefined;
    this.bindEndpointListeners();
    if (opts.updateMode) this.options.updateMode = opts.updateMode;
    if (opts.defer) this.scheduleUpdate();
    else this.update();
  }

  switchToPointMode(
    fromPoint: IPointData,
    toPoint: IPointData,
    opts: { autoUpdateMode?: boolean; updateMode?: "event" | "render" | "manual" } = {},
  ) {
    this.mode = "point";
    this.fromNode = undefined;
    this.toNode = undefined;
    this.cleanupNodeListeners();
    this.fromPoint = clonePoint(fromPoint);
    this.targetPoint = clonePoint(toPoint);
    if (opts.updateMode) this.options.updateMode = opts.updateMode;
    this.update();
  }

  switchToMixedMode(
    endpoints: { fromNode?: IUI; toNode?: IUI; fromPoint?: IPointData; toPoint?: IPointData },
    opts: { autoUpdateMode?: boolean; updateMode?: "event" | "render" | "manual" } = {},
  ) {
    if (
      (!endpoints.fromNode && !endpoints.fromPoint) ||
      (!endpoints.toNode && !endpoints.toPoint)
    ) {
      throw new Error("Invalid mixed connector endpoints");
    }
    if (endpoints.fromNode && endpoints.toNode) {
      this.switchToNodeMode(endpoints.fromNode, endpoints.toNode, opts);
      return;
    }
    if (endpoints.fromPoint && endpoints.toPoint) {
      this.switchToPointMode(endpoints.fromPoint, endpoints.toPoint, opts);
      return;
    }

    this.mode = "mixed";
    this.fromNode = endpoints.fromNode;
    this.toNode = endpoints.toNode;
    this.fromPoint = endpoints.fromPoint ? clonePoint(endpoints.fromPoint) : undefined;
    this.targetPoint = endpoints.toPoint ? clonePoint(endpoints.toPoint) : undefined;
    this.bindEndpointListeners();
    if (opts.updateMode) this.options.updateMode = opts.updateMode;
    this.update();
  }

  getState(): ConnectorState {
    const points = this.getPoints();
    return {
      mode: this.mode,
      ...(this.mode === "node" && this.fromNode && this.toNode
        ? { fromId: this.getNodeId(this.fromNode), toId: this.getNodeId(this.toNode) }
        : this.mode === "mixed"
          ? {
            ...(this.fromNode
              ? { fromId: this.getNodeId(this.fromNode) }
              : { fromPoint: clonePoint(points?.from || this.fromPoint || { x: 0, y: 0 }) }),
            ...(this.toNode
              ? { toId: this.getNodeId(this.toNode) }
              : { toPoint: clonePoint(points?.to || this.targetPoint || { x: 0, y: 0 }) }),
          }
          : {
            fromPoint: clonePoint(points?.from || this.fromPoint || { x: 0, y: 0 }),
            toPoint: clonePoint(points?.to || this.targetPoint || { x: 0, y: 0 }),
          }),
      routeType: this.routeType,
      padding: this.options.padding ?? DEFAULT_PADDING,
      margin: this.options.margin ?? DEFAULT_MARGIN,
      cornerRadius: this.getRouteCornerRadius(),
      bezierCurvature: this.options.bezierCurvature ?? DEFAULT_BEZIER_CURVATURE,
      opt1: cloneTargetOption(this.options.opt1),
      opt2: cloneTargetOption(this.options.opt2),
      stroke: this.wire.stroke as string | undefined,
      strokeWidth: getNumericProperty(this.wire, "strokeWidth", this.options.strokeWidth ?? 2),
      dashPattern: this.wire.dashPattern as number[] | undefined,
      startArrow: this.wire.startArrow,
      endArrow: this.wire.endArrow,
      scaleMode: this.options.scaleMode,
      arrowBaseScale: this.options.arrowBaseScale,
      label: this.options.label ? structuredClone(this.options.label) : undefined,
      waypoints: this.waypoints.length > 0 ? this.waypoints.map((p) => ({ ...p })) : undefined,
    };
  }

  setState(state: ConnectorState, resolveNode: (id: string | number) => IUI | undefined) {
    this.options = normalizeOptions({
      ...this.options,
      padding: state.padding,
      margin: state.margin,
      cornerRadius: state.cornerRadius,
      opt1: state.opt1,
      opt2: state.opt2,
      routeType: state.routeType,
      bezierCurvature: state.bezierCurvature,
      scaleMode: state.scaleMode,
      arrowBaseScale: state.arrowBaseScale,
      label: state.label,
      stroke: state.stroke,
      strokeWidth: state.strokeWidth,
      dashPattern: state.dashPattern,
      startArrow: state.startArrow,
      endArrow: state.endArrow,
    });
    this.applyStyle(state);

    if (state.mode === "node" && state.fromId !== undefined && state.toId !== undefined) {
      const from = resolveNode(state.fromId);
      const to = resolveNode(state.toId);
      if (!from || !to) throw new Error("Connector endpoint node not found");
      this.mode = "node";
      this.fromNode = from;
      this.toNode = to;
      this.fromPoint = undefined;
      this.targetPoint = undefined;
      this.bindEndpointListeners();
    } else if (state.mode === "mixed") {
      const from = state.fromId !== undefined ? resolveNode(state.fromId) : undefined;
      const to = state.toId !== undefined ? resolveNode(state.toId) : undefined;
      if (state.fromId !== undefined && !from) throw new Error("Connector from node not found");
      if (state.toId !== undefined && !to) throw new Error("Connector to node not found");
      if (!from && !state.fromPoint) throw new Error("Invalid mixed connector from endpoint");
      if (!to && !state.toPoint) throw new Error("Invalid mixed connector to endpoint");

      this.mode = "mixed";
      this.fromNode = from;
      this.toNode = to;
      this.fromPoint = state.fromPoint ? clonePoint(state.fromPoint) : undefined;
      this.targetPoint = state.toPoint ? clonePoint(state.toPoint) : undefined;
      this.bindEndpointListeners();
    } else if (state.fromPoint && state.toPoint) {
      this.mode = "point";
      this.fromNode = undefined;
      this.toNode = undefined;
      this.cleanupNodeListeners();
      this.fromPoint = clonePoint(state.fromPoint);
      this.targetPoint = clonePoint(state.toPoint);
    } else {
      throw new Error("Invalid connector state");
    }

    // 恢复中间点
    if (state.waypoints && state.waypoints.length > 0) {
      this.waypoints = state.waypoints.map((p) => ({ ...p }));
      this.syncWaypointHandles();
    }

    this.update();
  }

  setLabelText(text: string) {
    this.options.label = { ...(this.options.label || {}), text };
  }

  setLabelStyle(style: Partial<ITextInputData>) {
    this.options.label = { ...(this.options.label || {}), style };
  }

  update() {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      syncConnectorStyle(this);
      const endpoints = this.resolveEndpoints();
      if (!endpoints?.from?.linkPoint || !endpoints?.to?.linkPoint) return;

      let points: IPointData[];
      let path: string;

      if (this.waypoints.length > 0) {
        // 有中间点时，路径经过所有中间点
        const allPoints = [endpoints.from.linkPoint, ...this.waypoints, endpoints.to.linkPoint];
        points = allPoints;
        path = this.buildWaypointPath(allPoints);
        // 更新中间点 handle 位置
        this.waypoints.forEach((wp, i) => {
          const handle = this.waypointHandles[i];
          if (handle) {
            handle.x = wp.x - HANDLE_SIZE / 2;
            handle.y = wp.y - HANDLE_SIZE / 2;
          }
        });
      } else {
        const defaultResult = buildRoute(
          endpoints.from.linkPoint,
          endpoints.from.paddingPoint,
          endpoints.to.paddingPoint,
          endpoints.to.linkPoint,
          endpoints.from.side,
          endpoints.to.side,
          this.routeType,
          this.getRouteCornerRadius(),
          this.options.bezierCurvature ?? DEFAULT_BEZIER_CURVATURE,
        );
        const override = this.options.onDraw?.({
          s: endpoints.from,
          e: endpoints.to,
          defaultResult,
        });
        points = override?.points || defaultResult.points;
        path = override?.path || defaultResult.path;
      }

      this.lastRoutePoints = points.map(clonePoint);
      this.hitArea.path = path;
      this.hitArea.strokeWidth = Math.max(getNumericProperty(this.wire, "strokeWidth", 2) + 10, 12);
      this.wire.path = path;
      this.positionHandles(endpoints.from.linkPoint, endpoints.to.linkPoint);
      this.syncAttachedLabels();
      notifyConnectorGeometryUpdated(this);
    } catch {
      // Never let Layouter / bounds races break the editor.
    } finally {
      this.isUpdating = false;
    }
  }

  attachLabel(label: IUI) {
    this.attachedLabels.add(label);
  }

  detachLabel(label: IUI) {
    this.attachedLabels.delete(label);
  }

  /** Reposition bound labels to the current route midpoint (+ stored offsets). */
  syncAttachedLabels() {
    if (this.attachedLabels.size === 0) return;

    const center = routeLabelAnchor(this.lastRoutePoints);
    if (!center) return;

    for (const label of this.attachedLabels) {
      if ((label as unknown as { destroyed?: boolean }).destroyed) {
        this.attachedLabels.delete(label);
        continue;
      }

      const offsetX = getNumericProperty(label, CONNECTOR_LABEL_OFFSET_X, 0);
      const offsetY = getNumericProperty(label, CONNECTOR_LABEL_OFFSET_Y, 0);
      const width = getNumericProperty(label, "width", 36);
      const height = getNumericProperty(label, "height", 20);
      const nextX = center.x + offsetX - width / 2;
      const nextY = center.y + offsetY - height / 2;
      if (label.x !== nextX) label.x = nextX;
      if (label.y !== nextY) label.y = nextY;
    }
  }

  private buildWaypointPath(points: IPointData[]): string {
    if (points.length < 2) return "";
    const radius = this.getRouteCornerRadius();

    if (this.routeType === "bezier" && points.length >= 2) {
      // 贝塞尔曲线：使用二次贝塞尔连接各点
      let d = `M${points[0].x},${points[0].y}`;
      if (points.length === 2) {
        const mx = (points[0].x + points[1].x) / 2;
        d += ` Q${mx},${points[0].y} ${mx},${(points[0].y + points[1].y) / 2} Q${mx},${points[1].y} ${points[1].x},${points[1].y}`;
      } else {
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const mx = (prev.x + curr.x) / 2;
          const my = (prev.y + curr.y) / 2;
          if (i === 1) {
            d += ` Q${mx},${prev.y} ${mx},${my}`;
          } else if (i === points.length - 1) {
            d += ` Q${mx},${curr.y} ${curr.x},${curr.y}`;
          } else {
            d += ` T${mx},${my}`;
          }
        }
      }
      return d;
    }

    // 直线/折线模式，带圆角
    if (radius <= 0 || points.length < 3) {
      let d = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L${points[i].x},${points[i].y}`;
      }
      return d;
    }

    // 带圆角的折线
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      const len1 = Math.hypot(dx1, dy1);
      const len2 = Math.hypot(dx2, dy2);

      const maxRadius = Math.min(len1 / 2, len2 / 2, radius);

      const startX = curr.x - (dx1 / len1) * maxRadius;
      const startY = curr.y - (dy1 / len1) * maxRadius;
      const endX = curr.x + (dx2 / len2) * maxRadius;
      const endY = curr.y + (dy2 / len2) * maxRadius;

      d += ` L${startX},${startY}`;
      d += ` Q${curr.x},${curr.y} ${endX},${endY}`;
    }
    d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
    return d;
  }

  getRoutePoints() {
    return this.lastRoutePoints.map(clonePoint);
  }

  private scheduleUpdate() {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.update();
    });
  }

  private bindEndpointListeners() {
    this.cleanupNodeListeners();
    const nodes = [this.fromNode, this.toNode].filter(Boolean) as IUI[];
    const events = ["drag", "move", "move.end", "resize", "resize.end", "rotate", "rotate.end"];
    nodes.forEach((node) => {
      events.forEach((eventName) => {
        const handler = () => this.scheduleUpdate();
        node.on(eventName, handler);
        this.cleanupEndpointListeners.push(() => node.off(eventName, handler));
      });
    });
  }

  private cleanupNodeListeners() {
    this.cleanupEndpointListeners.forEach((cleanup) => cleanup());
    this.cleanupEndpointListeners = [];
  }

  private resolveEndpoints() {
    if (this.mode === "node" && this.fromNode && this.toNode) {
      // Prefer explicit linkPoints — no Layouter / getBounds needed.
      if (this.options.opt1?.linkPoint && this.options.opt2?.linkPoint) {
        return {
          from: resolveNodeEndpoint(
            this.fromNode,
            this.options.opt1,
            this.options.opt2.linkPoint,
            this.options.padding,
            this.options.margin,
          ),
          to: resolveNodeEndpoint(
            this.toNode,
            this.options.opt2,
            this.options.opt1.linkPoint,
            this.options.padding,
            this.options.margin,
          ),
        };
      }

      const fromBounds = getNodeBoundsBox(this.fromNode);
      const toBounds = getNodeBoundsBox(this.toNode);
      if (!fromBounds || !toBounds) return null;
      const fromCenter = getBoundsCenter(fromBounds);
      const toCenter = getBoundsCenter(toBounds);
      return {
        from: resolveNodeEndpoint(
          this.fromNode,
          this.options.opt1,
          toCenter,
          this.options.padding,
          this.options.margin,
        ),
        to: resolveNodeEndpoint(
          this.toNode,
          this.options.opt2,
          fromCenter,
          this.options.padding,
          this.options.margin,
        ),
      };
    }

    if (this.mode === "mixed") {
      const fromBounds = this.fromNode ? getNodeBoundsBox(this.fromNode) : null;
      const toBounds = this.toNode ? getNodeBoundsBox(this.toNode) : null;
      const fromReference = this.fromNode
        ? fromBounds
          ? getBoundsCenter(fromBounds)
          : null
        : this.fromPoint;
      const toReference = this.toNode
        ? toBounds
          ? getBoundsCenter(toBounds)
          : null
        : this.targetPoint;
      if (!fromReference || !toReference) return null;

      const fromEndpoint = this.fromNode
        ? resolveNodeEndpoint(
          this.fromNode,
          this.options.opt1,
          toReference,
          this.options.padding,
          this.options.margin,
        )
        : this.fromPoint
          ? pointEndpoint(this.fromPoint, inferSideByVector(this.fromPoint, toReference))
          : null;
      const toEndpoint = this.toNode
        ? resolveNodeEndpoint(
          this.toNode,
          this.options.opt2,
          fromReference,
          this.options.padding,
          this.options.margin,
        )
        : this.targetPoint
          ? pointEndpoint(this.targetPoint, inferSideByVector(this.targetPoint, fromReference))
          : null;
      if (!fromEndpoint || !toEndpoint) return null;

      return {
        from: fromEndpoint,
        to: toEndpoint,
      };
    }

    if (this.fromPoint && this.targetPoint) {
      return {
        from: pointEndpoint(this.fromPoint, inferSideByVector(this.fromPoint, this.targetPoint)),
        to: pointEndpoint(this.targetPoint, inferSideByVector(this.targetPoint, this.fromPoint)),
      };
    }

    return null;
  }

  private getNodeId(node: IUI) {
    return this.options.getNodeId?.(node) ?? node.innerId;
  }

  private applyStyle(state: ConnectorState) {
    syncConnectorStyle(this);
    this.options.stroke = state.stroke ?? this.options.stroke;
    this.options.strokeWidth = state.strokeWidth ?? this.options.strokeWidth;
    this.options.dashPattern = state.dashPattern;
    this.options.startArrow = state.startArrow;
    this.options.endArrow = state.endArrow;

    this.stroke = state.stroke ?? this.stroke;
    this.strokeWidth = state.strokeWidth ?? this.strokeWidth;
    this.dashPattern = state.dashPattern;
    this.startArrow = state.startArrow;
    this.endArrow = state.endArrow;

    this.wire.stroke = state.stroke ?? this.wire.stroke;
    this.wire.strokeWidth = state.strokeWidth ?? this.wire.strokeWidth;
    this.wire.dashPattern = state.dashPattern;
    this.wire.startArrow = state.startArrow;
    this.wire.endArrow = state.endArrow;
    this.hitArea.strokeWidth = Math.max(getNumericProperty(this.wire, "strokeWidth", 2) + 10, 12);
  }

  private positionHandles(from: IPointData, to: IPointData) {
    this.fromHandle.x = from.x - HANDLE_SIZE / 2;
    this.fromHandle.y = from.y - HANDLE_SIZE / 2;
    this.toHandle.x = to.x - HANDLE_SIZE / 2;
    this.toHandle.y = to.y - HANDLE_SIZE / 2;
  }

  private bindEndpointHandle(handle: Rect, endpoint: "from" | "to") {
    handle.on("drag", (event: { getPagePoint?: () => IPointData }) => {
      const point = event.getPagePoint?.() ?? {
        x: (handle.x ?? 0) + HANDLE_SIZE / 2,
        y: (handle.y ?? 0) + HANDLE_SIZE / 2,
      };
      this.updateDraggedEndpoint(endpoint, point);
    });
    handle.on("drag.end", () => this.options.onEndpointEditEnd?.());
  }

  private updateDraggedEndpoint(endpoint: "from" | "to", point: IPointData) {
    const target = this.findEndpointTarget(endpoint, point);
    const previousNode = endpoint === "from" ? this.fromNode : this.toNode;
    if (endpoint === "from") {
      this.fromNode = target;
      this.fromPoint = target ? undefined : clonePoint(point);
      this.options.opt1 = target ? { side: "auto", percent: 0.5 } : undefined;
    } else {
      this.toNode = target;
      this.targetPoint = target ? undefined : clonePoint(point);
      this.options.opt2 = target ? { side: "auto", percent: 0.5 } : undefined;
    }

    this.mode = this.fromNode && this.toNode ? "node" : this.fromNode || this.toNode ? "mixed" : "point";
    if (previousNode !== target) this.bindEndpointListeners();
    this.update();
  }

  private findEndpointTarget(endpoint: "from" | "to", point: IPointData): IUI | undefined {
    const tree = this.rootApp.tree;
    if (!tree) return undefined;
    const root = tree as unknown as IUI;
    const oppositeNode = endpoint === "from" ? this.toNode : this.fromNode;
    const picked = this.rootApp.pick(point)?.target as IUI | undefined;
    const direct = picked ? getConnectableRoot(picked, root) : undefined;
    if (direct && direct !== this && direct !== oppositeNode && !(direct instanceof Connector)) {
      return direct;
    }

    const zoom = Math.abs(tree.scaleX ?? 1) || 1;
    const snapDistance = 64 / zoom;
    let nearest: { node: IUI; distance: number } | undefined;
    for (const node of (tree.children as IUI[] | undefined) ?? []) {
      if (node === this || node === oppositeNode || node instanceof Connector || node.visible === false) continue;
      const bounds = getNodeBoundsBox(node);
      if (!bounds) continue;
      const distance = distanceToBounds(point, bounds);
      if (distance <= snapDistance && (!nearest || distance < nearest.distance)) {
        nearest = { node, distance };
      }
    }
    return nearest?.node;
  }

  // ---- Waypoint 支持 ----

  addWaypoint(point: IPointData) {
    this.waypoints.push({ ...point });
    this.syncWaypointHandles();
    this.update();
  }

  removeWaypoint(index: number) {
    if (index >= 0 && index < this.waypoints.length) {
      this.waypoints.splice(index, 1);
      this.syncWaypointHandles();
      this.update();
    }
  }

  getWaypoints(): IPointData[] {
    return this.waypoints.map((p) => ({ ...p }));
  }

  setWaypoints(points: IPointData[]) {
    this.waypoints = points.map((p) => ({ ...p }));
    this.syncWaypointHandles();
  }

  private syncWaypointHandles() {
    // 移除多余的 handle
    while (this.waypointHandles.length > this.waypoints.length) {
      const handle = this.waypointHandles.pop();
      if (handle) handle.destroy();
    }
    // 添加不足的 handle
    while (this.waypointHandles.length < this.waypoints.length) {
      const handle = new Rect({
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        cornerRadius: HANDLE_SIZE / 2,
        fill: "#ffffff",
        stroke: "#ff6b35",
        strokeWidth: 1.5,
        draggable: true,
        around: "center",
        name: "waypoint-handle",
      });
      this.waypointHandles.push(handle);
      this.add(handle);

      // 拖拽 waypoint handle 更新位置
      handle.on("drag", (e: { target: { x: number; y: number } }) => {
        const idx = this.waypointHandles.indexOf(handle);
        if (idx >= 0) {
          this.waypoints[idx] = {
            x: e.target.x + HANDLE_SIZE / 2,
            y: e.target.y + HANDLE_SIZE / 2,
          };
          this.update();
        }
      });
    }
    // 更新 handle 位置
    this.waypoints.forEach((wp, i) => {
      const handle = this.waypointHandles[i];
      if (handle) {
        handle.x = wp.x - HANDLE_SIZE / 2;
        handle.y = wp.y - HANDLE_SIZE / 2;
      }
    });
  }
}

export function syncConnectors(app: App) {
  app.tree.children?.forEach((child) => {
    if (child instanceof Connector) child.update();
  });
}

export function hasConnectors(app: App) {
  return Boolean(app.tree.children?.some((child) => child instanceof Connector));
}

export function createConnector(app: App, onEndpointEditEnd?: () => void) {
  return new Connector(app, {
    fromPoint: { x: 0, y: 0 },
    toPoint: { x: 0, y: 0 },
    getNodeId: (node: IUI) => String(node.innerId),
    onEndpointEditEnd,
  });
}

export function isConnector(value: unknown): value is Connector {
  return value instanceof Connector;
}

type ConnectorGeometryUpdatedHandler = (connector: Connector) => void;
const geometryUpdatedHandlers = new Set<ConnectorGeometryUpdatedHandler>();

/** Register a listener for connector path/geometry updates (e.g. label follow). */
export function onConnectorGeometryUpdated(handler: ConnectorGeometryUpdatedHandler) {
  geometryUpdatedHandlers.add(handler);
  return () => geometryUpdatedHandlers.delete(handler);
}

function notifyConnectorGeometryUpdated(connector: Connector) {
  if (geometryUpdatedHandlers.size === 0) return;
  geometryUpdatedHandlers.forEach((handler) => handler(connector));
}

function hasNodeEndpoints(
  options: ConnectorOptions,
): options is ConnectorOptions & { from: IUI; to: IUI } {
  return "from" in options && Boolean(options.from) && "to" in options && Boolean(options.to);
}

function normalizeOptions(options: Partial<RuntimeOptions>): RuntimeOptions {
  return {
    ...options,
    padding: options.padding ?? DEFAULT_PADDING,
    margin: options.margin ?? DEFAULT_MARGIN,
    cornerRadius: options.cornerRadius ?? DEFAULT_CORNER_RADIUS,
    routeType: options.routeType || "orthogonal",
    bezierCurvature: options.bezierCurvature ?? DEFAULT_BEZIER_CURVATURE,
  };
}

function createHandle() {
  return new Rect({
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    cornerRadius: HANDLE_SIZE / 2,
    fill: "#ffffff",
    stroke: "#278bfe",
    strokeWidth: 1,
    visible: false,
    editable: false,
    hittable: true,
    draggable: true,
  });
}

function getConnectableRoot(picked: IUI, root: IUI): IUI | undefined {
  if (picked === root) return undefined;
  let node = picked;
  while (node.parent && node.parent !== root) node = node.parent as IUI;
  return node === root ? undefined : node;
}

function distanceToBounds(
  point: IPointData,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const dx = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width));
  const dy = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height));
  return Math.hypot(dx, dy);
}

function resolveNodeEndpoint(
  node: IUI,
  option: TargetOption | undefined,
  toward: IPointData,
  globalPadding = DEFAULT_PADDING,
  globalMargin = DEFAULT_MARGIN,
): ConnectorPoint {
  if (option?.linkPoint) {
    const side =
      option.side && option.side !== "auto"
        ? option.side
        : inferSideByBounds(node, option.linkPoint);
    return pointEndpoint(option.linkPoint, side);
  }

  const bounds = getNodeBoundsBox(node) ?? { x: 0, y: 0, width: 0, height: 0 };
  const side =
    option?.side && option.side !== "auto" ? option.side : inferSideFromBounds(bounds, toward);
  const percent = clamp(option?.percent ?? 0.5, 0, 1);
  const margin = option?.margin ?? globalMargin;
  const padding = option?.padding ?? globalPadding;
  const linkPoint = getSidePoint(bounds, side, percent, margin);
  const dir = sideDirection(side);

  return {
    node,
    side,
    percent,
    margin,
    padding,
    linkPoint,
    paddingPoint: { x: linkPoint.x + dir.x * padding, y: linkPoint.y + dir.y * padding },
  };
}

type BoundsBox = { x: number; y: number; width: number; height: number };

/** Page-space box; prefer local geometry to avoid Leafer Layouter races. */
function getNodeBoundsBox(node: IUI): BoundsBox | null {
  const local = readLocalBoundsBox(node);
  if (local && local.width > 0 && local.height > 0) return local;

  try {
    const bounds = node.getBounds("box", "page");
    if (
      bounds &&
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height)
    ) {
      return bounds;
    }
  } catch {
    // Layouter may throw before the first layout pass.
  }

  return local;
}

function readLocalBoundsBox(node: IUI): BoundsBox | null {
  try {
    const x = typeof node.x === "number" ? node.x : 0;
    const y = typeof node.y === "number" ? node.y : 0;
    const stored = (node as unknown as Record<string, unknown>)[FLOW_BOX_SIZE_PROP] as
      | { width?: number; height?: number }
      | undefined;
    let width =
      typeof stored?.width === "number"
        ? stored.width
        : typeof node.width === "number"
          ? node.width
          : 0;
    let height =
      typeof stored?.height === "number"
        ? stored.height
        : typeof node.height === "number"
          ? node.height
          : 0;

    const children = (node as unknown as { children?: IUI[] }).children;
    if ((!width || !height) && Array.isArray(children)) {
      for (const child of children) {
        const childX = typeof child.x === "number" ? child.x : 0;
        const childY = typeof child.y === "number" ? child.y : 0;
        const childW = typeof child.width === "number" ? child.width : 0;
        const childH = typeof child.height === "number" ? child.height : 0;
        if (childW > 0 || childH > 0) {
          width = Math.max(width, childX + childW);
          height = Math.max(height, childY + childH);
        }
      }
    }

    if (!width && !height) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}

function pointEndpoint(point: IPointData, side: ConnectorSide): ConnectorPoint {
  return {
    side,
    percent: 0.5,
    margin: 0,
    padding: 0,
    linkPoint: clonePoint(point),
    paddingPoint: clonePoint(point),
  };
}

function buildRoute(
  fromLink: IPointData,
  from: IPointData,
  to: IPointData,
  toLink: IPointData,
  fromSide: ConnectorSide,
  toSide: ConnectorSide,
  routeType: ConnectorRouteType,
  cornerRadius: number,
  bezierCurvature: number,
): ConnectorDrawResult {
  if (routeType === "straight") {
    const points = [fromLink, toLink];
    return { points, path: `M ${fromLink.x} ${fromLink.y} L ${toLink.x} ${toLink.y}` };
  }

  if (routeType === "bezier") {
    const { c1, c2 } = getCubicBezierControls(fromLink, toLink, fromSide, toSide, bezierCurvature);
    return {
      points: [fromLink, toLink],
      path: `M ${fromLink.x} ${fromLink.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${toLink.x} ${toLink.y}`,
    };
  }

  const routePoints = buildOrthogonalPoints(from, to, fromSide, toSide);
  const points = normalizePolyline([fromLink, ...routePoints, toLink]);
  return { points, path: buildRoundedPolylinePath(points, cornerRadius) };
}

function buildOrthogonalPoints(
  from: IPointData,
  to: IPointData,
  fromSide: ConnectorSide,
  toSide: ConnectorSide,
) {
  const fromHorizontal = fromSide === "left" || fromSide === "right";
  const toHorizontal = toSide === "left" || toSide === "right";

  if (fromHorizontal && toHorizontal) {
    const midX = (from.x + to.x) / 2;
    return normalizePolyline([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]);
  }
  if (!fromHorizontal && !toHorizontal) {
    const midY = (from.y + to.y) / 2;
    return normalizePolyline([from, { x: from.x, y: midY }, { x: to.x, y: midY }, to]);
  }

  const bend = fromHorizontal ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  return normalizePolyline([from, bend, to]);
}

function buildRoundedPolylinePath(points: IPointData[], radius: number) {
  if (!points.length) return "M 0 0";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2 || radius <= 0) {
    return points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const v1 = { x: cur.x - prev.x, y: cur.y - prev.y };
    const v2 = { x: next.x - cur.x, y: next.y - cur.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (!len1 || !len2) continue;

    const r = Math.min(Math.max(radius, 0), len1 / 2, len2 / 2);
    const p1 = { x: cur.x - (v1.x / len1) * r, y: cur.y - (v1.y / len1) * r };
    const p2 = { x: cur.x + (v2.x / len2) * r, y: cur.y + (v2.y / len2) * r };
    d += ` L ${p1.x} ${p1.y} Q ${cur.x} ${cur.y} ${p2.x} ${p2.y}`;
  }

  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

function normalizePolyline(points: IPointData[]) {
  const withoutDuplicates: IPointData[] = [];
  points.forEach((point) => {
    const last = withoutDuplicates[withoutDuplicates.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) withoutDuplicates.push(point);
  });

  const normalized: IPointData[] = [];
  for (let i = 0; i < withoutDuplicates.length; i++) {
    const prev = normalized[normalized.length - 1];
    const point = withoutDuplicates[i];
    const next = withoutDuplicates[i + 1];
    if (!prev || !next) {
      normalized.push(point);
      continue;
    }

    const collinear =
      (prev.x === point.x && point.x === next.x) || (prev.y === point.y && point.y === next.y);
    if (!collinear) normalized.push(point);
  }
  return normalized;
}

function getCubicBezierControls(
  from: IPointData,
  to: IPointData,
  fromSide: ConnectorSide,
  toSide: ConnectorSide,
  curvature: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const k = clamp(dist * Math.abs(curvature), 24, 240);
  const d1 = sideDirection(fromSide);
  const d2 = sideDirection(toSide);
  return {
    c1: { x: from.x + d1.x * k, y: from.y + d1.y * k },
    c2: { x: to.x + d2.x * k, y: to.y + d2.y * k },
  };
}

function getSidePoint(
  bounds: { x: number; y: number; width: number; height: number },
  side: ConnectorSide,
  percent: number,
  margin: number,
) {
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;
  if (side === "top") return { x: x + w * percent, y: y - margin };
  if (side === "bottom") return { x: x + w * percent, y: y + h + margin };
  if (side === "left") return { x: x - margin, y: y + h * percent };
  return { x: x + w + margin, y: y + h * percent };
}

function inferSideFromBounds(
  bounds: { x: number; y: number; width: number; height: number },
  toward: IPointData,
): ConnectorSide {
  const center = getBoundsCenter(bounds);
  return inferSideByVector(center, toward);
}

function inferSideByBounds(node: IUI, point: IPointData): ConnectorSide {
  const bounds = getNodeBoundsBox(node);
  if (!bounds) return "right";
  const left = Math.abs(point.x - bounds.x);
  const right = Math.abs(point.x - (bounds.x + bounds.width));
  const top = Math.abs(point.y - bounds.y);
  const bottom = Math.abs(point.y - (bounds.y + bounds.height));
  const min = Math.min(left, right, top, bottom);
  if (min === left) return "left";
  if (min === right) return "right";
  if (min === top) return "top";
  return "bottom";
}

function inferSideByVector(from: IPointData, to: IPointData): ConnectorSide {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function sideDirection(side: ConnectorSide) {
  if (side === "left") return { x: -1, y: 0 };
  if (side === "right") return { x: 1, y: 0 };
  if (side === "top") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function getBoundsCenter(bounds: { x: number; y: number; width: number; height: number }) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function clonePoint(point: IPointData): IPointData {
  return { x: point.x, y: point.y };
}

function cloneTargetOption(option: TargetOption | undefined) {
  if (!option) return undefined;
  return { ...option, linkPoint: option.linkPoint ? clonePoint(option.linkPoint) : undefined };
}

function getNumericProperty(source: unknown, key: string, fallback: number) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : fallback;
}

function syncConnectorStyle(connector: Connector) {
  const style = connector as unknown as {
    stroke?: unknown;
    strokeWidth?: unknown;
    dashPattern?: unknown;
    startArrow?: unknown;
    endArrow?: unknown;
  };
  connector.wire.stroke = style.stroke as never;
  connector.wire.strokeWidth =
    typeof style.strokeWidth === "number" ? style.strokeWidth : connector.wire.strokeWidth;
  connector.wire.dashPattern = Array.isArray(style.dashPattern) ? style.dashPattern : undefined;
  connector.wire.startArrow = style.startArrow as never;
  connector.wire.endArrow = style.endArrow as never;
  connector.hitArea.strokeWidth = Math.max(
    getNumericProperty(connector.wire, "strokeWidth", 2) + 10,
    12,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Midpoint along a polyline — used to park connector labels. */
function routeLabelAnchor(points: IPointData[]): IPointData | null {
  if (points.length < 2) return null;

  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) return clonePoint(points[Math.floor(points.length / 2)]);

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

  return clonePoint(points[points.length - 1]);
}
