import { PointerEvent, type IPointData, type IUI } from "leafer";
import { Connector } from "leafer-connector";
import type { ConnectorSide } from "leafer-connector";
import type { IDrawOptions, IDrawResult } from "../types";
import { DrawBase } from "./draw-base";
import { getConnectorRouteType } from "../core/drawing-settings";

const CONNECT_SNAP_DISTANCE = 18;

export class DrawArrow extends DrawBase {
  private options: IDrawOptions;
  private startNode: IUI | null = null;

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

  protected createElement(startPoint: IPointData): IUI {
    if (!this.editor) {
      throw new Error("Editor is not initialized");
    }

    const startTarget = this.pickConnectableNode(startPoint);
    this.startNode = startTarget.node;
    const fromPoint = startTarget.point;

    const connector = new Connector(this.editor.app, {
      fromPoint,
      toPoint: fromPoint,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      cornerRadius: this.options.cornerRadius,
      endArrow: "arrow",
      routeType: getConnectorRouteType(),
      getNodeId: (node: IUI) => node.innerId,
    });

    connector.opacity = this.options.opacity;
    return connector;
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint;

    const startPoint = this.points[0];
    if (startPoint) {
      const connector = element as Connector;
      const endTarget = this.pickConnectableNode(endPoint, startPoint);
      connector.setPoints(startPoint, endTarget.point);
    }
  }

  protected onUp(evt: PointerEvent | null) {
    if (!this.element) {
      super.onUp(evt);
      return;
    }

    const connector = this.element as Connector;
    const rawEndPoint =
      evt && evt.getPagePoint
        ? evt.getPagePoint()
        : connector.getPoints()?.to || this.points[1] || { x: 0, y: 0 };
    const startPoint = this.points[0] || connector.getPoints()?.from || rawEndPoint;
    const endTarget = this.pickConnectableNode(rawEndPoint, startPoint);
    const endNode = endTarget.node;

    connector.routeType = getConnectorRouteType();

    if (this.startNode && endNode && this.startNode !== endNode) {
      connector.switchToNodeMode(this.startNode, endNode, {
        updateMode: "event",
      });
      const state = connector.getState();
      connector.setState(
        {
          ...state,
          opt1: this.getTargetOption(this.startNode, rawEndPoint),
          opt2: this.getTargetOption(endNode, startPoint),
        } as never,
        (id: string | number) => {
          if (this.startNode?.innerId === id) return this.startNode;
          if (endNode.innerId === id) return endNode;
          return undefined;
        },
      );
    } else {
      const fromPoint = this.startNode
        ? getNearestSideAnchor(this.startNode, rawEndPoint).point
        : this.points[0] || { x: 0, y: 0 };
      const toPoint = endNode ? getNodeCenter(endNode) : endTarget.point;

      if (this.startNode || endNode) {
        if (!this.startNode) connector.startArrow = "circle";
        if (!endNode) connector.endArrow = "circle";
      }

      connector.setPoints(fromPoint, toPoint);
    }

    connector.hittable = true;
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
  ): { node: IUI | null; point: IPointData; side?: ConnectorSide } {
    if (!this.editor) return { node: null, point };

    const picked = this.editor.app.pick(point)?.target as IUI | undefined;
    if (picked && !(picked instanceof Connector)) {
      const anchor = getNearestSideAnchor(picked, toward || point);
      return { node: picked, point: anchor.point, side: anchor.side };
    }

    const nearby = findNearestNode(this.editor.app.tree.children || [], point);
    if (nearby && nearby.distance <= CONNECT_SNAP_DISTANCE) {
      const anchor = getNearestSideAnchor(nearby.node, toward || point);
      return { node: nearby.node, point: anchor.point, side: anchor.side };
    }

    return { node: null, point };
  }

  private getTargetOption(node: IUI, toward: IPointData) {
    return {
      side: getNearestSideAnchor(node, toward).side,
      percent: 0.5,
    };
  }
}

function findNearestNode(nodes: IUI[], point: IPointData): { node: IUI; distance: number } | null {
  let nearest: { node: IUI; distance: number } | null = null;

  for (const node of nodes) {
    if (node instanceof Connector) continue;

    const bounds = node.getBounds("box", "page");
    const distance = distanceToBounds(point, bounds);
    if (!nearest || distance < nearest.distance) {
      nearest = { node, distance };
    }
  }

  return nearest;
}

function getNodeCenter(node: IUI): IPointData {
  const bounds = node.getBounds("box", "page");
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function getNearestSideAnchor(node: IUI, toward: IPointData): { point: IPointData; side: ConnectorSide } {
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
