import { PointerEvent, type IPointData, type IUI } from "leafer";
import { Connector } from "../core/connector";
import type { ConnectorSide } from "../core/connector";
import type { IDrawOptions, IDrawResult } from "../types";
import { DrawBase } from "./draw-base";
import { getConnectorRouteType } from "../core/drawing-settings";

type ConnectorTargetReason = "none" | "hit" | "nearby" | "directional";

type ConnectorTarget = {
  node: IUI | null;
  point: IPointData;
  reason: ConnectorTargetReason;
  confidence: number;
};

type EditableConnector = Connector & {
  routeType?: ReturnType<typeof getConnectorRouteType>;
};

export class DrawArrow extends DrawBase {
  private options: IDrawOptions;
  private startNode: IUI | null = null;
  private startAnchorPoint: IPointData | null = null;
  private lastEndTarget: ConnectorTarget | null = null;
  private snapDisabled = false;
  private readonly BASE_SNAP_DISTANCE = 64;

  private getSnapDistance(): number {
    const zoom = this.editor?.app.tree.scaleX;
    return zoom && zoom > 0 ? this.BASE_SNAP_DISTANCE / zoom : this.BASE_SNAP_DISTANCE;
  }

  constructor(options?: IDrawOptions) {
    super();
    this.options = {
      stroke: "#278bfe",
      strokeWidth: 2,
      cornerRadius: 10,
      opacity: 0.7,
      ...options,
    };
  }

  protected onDown(evt: PointerEvent) {
    this.snapDisabled = evt.altKey;
    super.onDown(evt);
  }

  protected onMove(evt: PointerEvent) {
    this.snapDisabled = evt.altKey;
    super.onMove(evt);
  }

  protected createElement(startPoint: IPointData): IUI {
    if (!this.editor) {
      throw new Error("Editor is not initialized");
    }

    const startTarget = this.pickConnectableNode(startPoint);
    this.startNode = startTarget.node;
    const fromPoint = startTarget.point;
    this.startAnchorPoint = fromPoint;

    const connector = new Connector(this.editor.app, {
      fromPoint,
      toPoint: fromPoint,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      cornerRadius: this.options.cornerRadius,
      endArrow: "arrow",
      routeType: getConnectorRouteType(),
      getNodeId: (node: IUI) => String(node.innerId),
    });

    connector.opacity = this.options.opacity;
    return connector;
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint;

    const startPoint = this.startAnchorPoint || this.points[0];
    if (startPoint) {
      const connector = element as Connector;
      const endTarget = this.pickConnectableNode(endPoint, startPoint, {
        ignoredNodes: this.getIgnoredNodes(connector),
      });
      this.lastEndTarget = endTarget.node ? endTarget : null;
      connector.setPoints(startPoint, endTarget.point);
    }
  }

  protected onUp(evt: PointerEvent | null) {
    if (!this.element) {
      this.startAnchorPoint = null;
      this.startNode = null;
      this.lastEndTarget = null;
      this.snapDisabled = false;
      super.onUp(evt);
      return;
    }

    const connector = this.element as Connector;
    const rawEndPoint =
      evt && evt.getPagePoint
        ? evt.getPagePoint()
        : connector.getPoints()?.to || this.points[1] || { x: 0, y: 0 };
    const startPoint =
      this.startAnchorPoint || this.points[0] || connector.getPoints()?.from || rawEndPoint;
    const endTarget = evt?.altKey
      ? createFreeTarget(rawEndPoint)
      : this.lastEndTarget ||
        this.pickConnectableNode(rawEndPoint, startPoint, {
          ignoredNodes: this.getIgnoredNodes(connector),
        });
    const endNode = endTarget.node;

    (connector as EditableConnector).routeType = getConnectorRouteType();

    if (this.startNode && endNode && this.startNode !== endNode) {
      bindConnectorToNodes(connector, this.startNode, endNode, {
        opt1: this.getTargetOption(this.startNode, endTarget.point),
        opt2: this.getTargetOption(endNode, startPoint),
      });
    } else {
      const fromPoint =
        this.startAnchorPoint ||
        (this.startNode
          ? getNearestSideAnchor(this.startNode, endTarget.point).point
          : this.points[0] || { x: 0, y: 0 });
      const toPoint = endNode ? getNodeCenter(endNode) : endTarget.point;

      if (this.startNode || endNode) {
        if (!this.startNode) connector.startArrow = "circle";
        if (!endNode) connector.endArrow = "circle";
        connector.switchToMixedMode(
          {
            fromNode: this.startNode || undefined,
            toNode: endNode || undefined,
            fromPoint: this.startNode ? undefined : fromPoint,
            toPoint: endNode ? undefined : endTarget.point,
          },
          { updateMode: "event" },
        );
        const state = connector.getState();
        connector.setState(
          {
            ...state,
            opt1: this.startNode
              ? this.getTargetOption(this.startNode, endTarget.point)
              : state.opt1,
            opt2: endNode ? this.getTargetOption(endNode, startPoint) : state.opt2,
          } as never,
          (id: string | number) => {
            if (this.startNode && matchesNodeId(this.startNode, id)) return this.startNode;
            if (endNode && matchesNodeId(endNode, id)) return endNode;
            return undefined;
          },
        );
      } else {
        connector.setPoints(fromPoint, toPoint);
      }
    }

    connector.hittable = true;
    this.startAnchorPoint = null;
    this.startNode = null;
    this.lastEndTarget = null;
    super.onUp(evt);
  }

  protected getResult(): IDrawResult {
    return {
      action: "arrow",
      element: this.element,
    };
  }

  private pickConnectableNode(
    point: IPointData,
    toward?: IPointData,
    options: { ignoredNodes?: IUI[] } = {},
  ): ConnectorTarget {
    if (!this.editor || this.snapDisabled) return createFreeTarget(point);

    const picked = this.editor.app.pick(point)?.target as IUI | undefined;
    const pickedNode = picked
      ? getConnectableNode(picked, this.editor.app.tree as unknown as IUI)
      : null;
    if (
      pickedNode &&
      !options.ignoredNodes?.includes(pickedNode) &&
      !(pickedNode instanceof Connector)
    ) {
      const anchor = getNearestSideAnchor(pickedNode, toward || point);
      return { node: pickedNode, point: anchor.point, reason: "hit", confidence: 1 };
    }

    const ignoredNodes = options.ignoredNodes || [];
    const nearby = findNearestNode(this.editor.app.tree.children || [], point, ignoredNodes);
    if (nearby && nearby.distance <= this.getSnapDistance()) {
      const anchor = getNearestSideAnchor(nearby.node, toward || point);
      return {
        node: nearby.node,
        point: anchor.point,
        reason: "nearby",
        confidence: 1 - nearby.distance / this.getSnapDistance(),
      };
    }

    if (toward && this.startNode) {
      const directional = findDirectionalNode(
        this.editor.app.tree.children || [],
        toward,
        point,
        ignoredNodes,
        this.getSnapDistance() * 0.75,
      );
      if (directional) {
        const anchor = getNearestSideAnchor(directional.node, toward);
        return {
          node: directional.node,
          point: anchor.point,
          reason: "directional",
          confidence: 0.5,
        };
      }
    }

    return createFreeTarget(point);
  }

  private getIgnoredNodes(connector: Connector) {
    return [connector, ...(this.startNode ? [this.startNode] : [])];
  }

  private getTargetOption(node: IUI, toward: IPointData) {
    return {
      side: getNearestSideAnchor(node, toward).side,
      percent: 0.5,
    };
  }
}

function bindConnectorToNodes(
  connector: Connector,
  from: IUI,
  to: IUI,
  options: {
    opt1: ReturnType<DrawArrow["getTargetOption"]>;
    opt2: ReturnType<DrawArrow["getTargetOption"]>;
  },
) {
  connector.switchToNodeMode(from, to, { updateMode: "event" });
  const state = connector.getState();
  connector.setState(
    {
      ...state,
      opt1: options.opt1,
      opt2: options.opt2,
    } as never,
    (id: string | number) => {
      if (matchesNodeId(from, id)) return from;
      if (matchesNodeId(to, id)) return to;
      return undefined;
    },
  );
}

function createFreeTarget(point: IPointData): ConnectorTarget {
  return { node: null, point, reason: "none", confidence: 0 };
}

function matchesNodeId(node: IUI, id: string | number) {
  return String(node.innerId) === String(id) || String(node.id) === String(id);
}

function getConnectableNode(picked: IUI, root: IUI): IUI | null {
  if (picked === root || picked instanceof Connector) return null;

  let node: IUI = picked;
  while (node.parent && node.parent !== root) {
    node = node.parent as IUI;
  }

  if (node === root || node instanceof Connector) return null;
  return node;
}

function findNearestNode(
  nodes: IUI[],
  point: IPointData,
  ignoredNodes: IUI[] = [],
): { node: IUI; distance: number } | null {
  let nearest: { node: IUI; distance: number } | null = null;

  for (const node of nodes) {
    if (ignoredNodes.includes(node) || node instanceof Connector || node.visible === false)
      continue;

    const bounds = node.getBounds("box", "page");
    const distance = distanceToBounds(point, bounds);
    if (!nearest || distance < nearest.distance) {
      nearest = { node, distance };
    }
  }

  return nearest;
}

function findDirectionalNode(
  nodes: IUI[],
  start: IPointData,
  point: IPointData,
  ignoredNodes: IUI[] = [],
  tolerance = 120,
): { node: IUI; distance: number } | null {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 8) return null;

  const ux = dx / length;
  const uy = dy / length;
  let best: { node: IUI; distance: number; projection: number } | null = null;

  for (const node of nodes) {
    if (ignoredNodes.includes(node) || node instanceof Connector || node.visible === false)
      continue;

    const bounds = node.getBounds("box", "page");
    const center = getBoundsCenter(bounds);
    const vx = center.x - start.x;
    const vy = center.y - start.y;
    const projection = vx * ux + vy * uy;
    if (projection <= length * 0.35) continue;

    const perpendicular = Math.abs(vx * uy - vy * ux);
    const edgeDistance = distanceToBounds(point, bounds);
    const maxTolerance = Math.max(tolerance, Math.min(bounds.width, bounds.height) / 2);
    if (perpendicular > maxTolerance && edgeDistance > tolerance) continue;

    const score = Math.max(0, projection - length) + perpendicular * 0.35 + edgeDistance * 0.2;
    if (!best || score < best.distance) {
      best = { node, distance: score, projection };
    }
  }

  return best ? { node: best.node, distance: best.distance } : null;
}

function getBoundsCenter(bounds: { x: number; y: number; width: number; height: number }) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function getNodeCenter(node: IUI): IPointData {
  const bounds = node.getBounds("box", "page");
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function getNearestSideAnchor(
  node: IUI,
  toward: IPointData,
): { point: IPointData; side: ConnectorSide } {
  const bounds = node.getBounds("box", "page");
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const side: ConnectorSide =
    Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";

  if (side === "left") return { side, point: { x: bounds.x, y: center.y } };
  if (side === "right") return { side, point: { x: bounds.x + bounds.width, y: center.y } };
  if (side === "top") return { side, point: { x: center.x, y: bounds.y } };
  return { side, point: { x: center.x, y: bounds.y + bounds.height } };
}

function distanceToBounds(
  point: IPointData,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const dx = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width));
  const dy = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height));
  return Math.hypot(dx, dy);
}
