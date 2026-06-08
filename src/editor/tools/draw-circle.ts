import { Ellipse, Group, Text, type IPointData, type IUI } from "leafer";
import type { IDrawOptions, IDrawResult, TCallback } from "../types";
import { makeGroupSelectionAtomic } from "../core/group-selection";
import { DrawBase } from "./draw-base";

export class DrawCircle extends DrawBase {
  private options: IDrawOptions;

  constructor(options?: IDrawOptions) {
    super();
    this.options = {
      fill: "#FEB027",
      stroke: "#13ad8cff",
      strokeWidth: 1,
      opacity: 0.7,
      ...options,
    };
  }

  protected createElement(startPoint: IPointData): IUI {
    const circle = new Ellipse({
      editable: false,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    });

    const text = new Text({
      draggable: false,
      editable: true,
      text: "圆形",
      fill: "#333",
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "center",
      verticalAlign: "middle",
      x: 10,
      y: 10,
    });

    const group = new Group({
      editable: true,
      x: startPoint.x,
      y: startPoint.y,
      name: "圆形",
      children: [circle, text],
    });
    makeGroupSelectionAtomic(group);
    return group;
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint;
    const startPoint = this.points[0];
    if (!startPoint) return;

    const group = element as Group;
    const bounds = this.calculateEllipseBounds(startPoint, endPoint);
    const children = group.children;
    if (!children || children.length < 2) return;

    group.x = bounds.x;
    group.y = bounds.y;

    const circle = children[0] as Ellipse;
    circle.x = 0;
    circle.y = 0;
    circle.width = bounds.width;
    circle.height = bounds.height;

    const text = children[1] as Text;
    text.x = 10;
    text.y = 10;
    text.width = Math.max(bounds.width - 20, 0);
    text.height = Math.max(bounds.height - 20, 0);
    text.visible = bounds.width > 40 && bounds.height > 30;
  }

  protected getResult(): IDrawResult {
    return {
      action: "circle",
      element: this.element,
    };
  }

  execute(callback: TCallback) {
    super.execute(callback);
  }

  private calculateEllipseBounds(startPoint: IPointData, endPoint: IPointData) {
    return {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y),
    };
  }
}
