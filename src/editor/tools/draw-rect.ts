import { Group, Rect, Text, type IPointData, type IUI } from "leafer";
import type { IDrawOptions, IDrawResult, TCallback } from "../types";
import { makeGroupSelectionAtomic } from "../core/group-selection";
import { DrawBase } from "./draw-base";

export class DrawRect extends DrawBase {
  private options: IDrawOptions;

  constructor(options?: IDrawOptions) {
    super();
    this.options = {
      fill: "#FEB027",
      stroke: "#13ad8cff",
      cornerRadius: 10,
      opacity: 0.7,
      ...options,
    };
  }

  protected createElement(startPoint: IPointData): IUI {
    const rect = new Rect({
      editable: false,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      cornerRadius: this.options.cornerRadius,
      opacity: this.options.opacity,
    });

    const group = new Group({
      editable: true,
      x: startPoint.x,
      y: startPoint.y,
      name: "矩形",
      children: [rect, this.createText("矩形")],
    });
    makeGroupSelectionAtomic(group);
    return group;
  }

  protected updateElement(element: IUI, endPoint: IPointData) {
    this.points[1] = endPoint;

    const startPoint = this.points[0];
    if (!startPoint) return;

    const group = element as Group;
    const bounds = this.calculateRectBounds(startPoint, endPoint);
    group.x = bounds.x;
    group.y = bounds.y;

    const children = group.children;
    if (!children || children.length < 2) return;

    const rect = children[0] as Rect;
    rect.width = bounds.width;
    rect.height = bounds.height;
    this.updateTextBox(children[1] as Text, bounds.width, bounds.height);
  }

  protected getResult(): IDrawResult {
    return {
      action: "rect",
      element: this.element,
    };
  }

  execute(callback: TCallback) {
    super.execute(callback);
  }

  private createText(text: string) {
    return new Text({
      draggable: false,
      editable: true,
      text,
      fill: "#333",
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "center",
      verticalAlign: "middle",
      x: 10,
      y: 10,
    });
  }

  private updateTextBox(text: Text, width: number, height: number) {
    text.x = 10;
    text.y = 10;
    text.width = Math.max(width - 20, 0);
    text.height = Math.max(height - 20, 0);
    text.visible = width > 40 && height > 30;
  }

  private calculateRectBounds(startPoint: IPointData, endPoint: IPointData) {
    return {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y),
    };
  }
}
