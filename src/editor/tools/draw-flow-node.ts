import { Group, Text, type IPointData, type IUI } from "leafer";
import type { IDrawOptions, IDrawResult } from "../types";
import { makeGroupSelectionAtomic } from "../core/group-selection";
import { createFlowNodeShape, updateFlowNodeShape, type FlowNodeKind } from "../core/flow-node-shape";
import { DrawBase } from "./draw-base";

export type { FlowNodeKind };

interface FlowNodeOptions extends IDrawOptions {
  kind: FlowNodeKind;
  label: string;
}

export class DrawFlowNode extends DrawBase {
  private options: FlowNodeOptions;

  constructor(options: FlowNodeOptions) {
    super();
    this.options = {
      fill: "#ffffff",
      stroke: "#2563eb",
      strokeWidth: 2,
      opacity: 1,
      ...options,
    };
  }

  protected createElement(startPoint: IPointData): IUI {
    const shape = createFlowNodeShape(this.options.kind, {
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
      cornerRadius: this.options.cornerRadius,
    });
    const text = new Text({
      draggable: false,
      editable: true,
      text: this.options.label,
      fill: "#1f2937",
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      verticalAlign: "middle",
      x: 12,
      y: 10,
    });

    const group = new Group({
      editable: true,
      x: startPoint.x,
      y: startPoint.y,
      name: this.options.label,
      children: [shape, text],
    });
    makeGroupSelectionAtomic(group);
    return group;
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint;
    const startPoint = this.points[0];
    if (!startPoint) return;

    const group = element as Group;
    const bounds = this.calculateBounds(startPoint, endPoint);
    group.x = bounds.x;
    group.y = bounds.y;

    const children = group.children;
    if (!children || children.length < 2) return;

    updateFlowNodeShape(children[0] as IUI, this.options.kind, bounds.width, bounds.height);

    const text = children[1] as Text;
    text.x = 12;
    text.y = 10;
    text.width = Math.max(bounds.width - 24, 0);
    text.height = Math.max(bounds.height - 20, 0);
    text.visible = bounds.width > 52 && bounds.height > 34;
  }

  protected getResult(): IDrawResult {
    return {
      action: this.options.kind,
      element: this.element,
    };
  }

  private calculateBounds(startPoint: IPointData, endPoint: IPointData) {
    return {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y),
    };
  }
}
