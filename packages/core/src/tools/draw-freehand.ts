import { Path, type IPointData, type IUI } from "leafer";
import type { IDrawOptions, IDrawResult } from "../types";
import { DrawBase } from "./draw-base";
import { getFreehandSmoothness } from "../core/drawing-settings";

interface FreehandOptions {
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

function distance(p1: IPointData, p2: IPointData): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function simplifyPoints(points: IPointData[], tolerance = 1): IPointData[] {
  if (points.length < 3) return points;

  const result: IPointData[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    if (distance(prev, curr) >= tolerance) {
      result.push(curr);
    }
  }
  return result;
}

function resamplePoints(points: IPointData[], minDistance = 3): IPointData[] {
  if (points.length < 2) return points;

  const result: IPointData[] = [points[0]];
  let last = points[0];

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    if (distance(last, curr) < minDistance) continue;
    result.push(curr);
    last = curr;
  }

  const lastPoint = points[points.length - 1];
  if (result[result.length - 1] !== lastPoint) {
    result.push(lastPoint);
  }

  return result;
}

function getMidPoint(p1: IPointData, p2: IPointData): IPointData {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function pointsToSmoothPath(points: IPointData[], closed = false): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return closed
      ? `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y} Z`
      : `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const mid1 = getMidPoint(p0, p1);
    const mid2 = getMidPoint(p1, p2);
    path += ` L${mid1.x},${mid1.y} Q${p1.x},${p1.y} ${mid2.x},${mid2.y}`;
  }

  const lastPoint = points[points.length - 1];
  const secondLastPoint = points[points.length - 2];
  const mid = getMidPoint(secondLastPoint, lastPoint);
  path += ` L${mid.x},${mid.y} L${lastPoint.x},${lastPoint.y}`;
  if (closed) path += " Z";
  return path;
}

export class DrawFreehand extends DrawBase {
  private options: FreehandOptions;
  private drawingPoints: IPointData[] = [];

  constructor(options?: IDrawOptions & Partial<FreehandOptions>) {
    super();
    this.options = {
      stroke: "#333333",
      strokeWidth: 2,
      opacity: 1,
      ...options,
    };
  }

  protected createElement(startPoint: IPointData): IUI {
    this.drawingPoints = [startPoint];

    return new Path({
      editable: true,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
      path: `M${startPoint.x},${startPoint.y}`,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    });
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.drawingPoints.push(endPoint);
    (element as Path).path = this.buildPath(this.drawingPoints);
  }

  protected getResult(): IDrawResult {
    if (!this.element) {
      return { action: "freehand", element: this.element };
    }

    const finalPath = this.buildPath(this.drawingPoints);
    (this.element as Path).path = finalPath;
    return { action: "freehand", element: this.element };
  }

  private buildPath(points: IPointData[]) {
    const smoothness = getFreehandSmoothness();
    const sampled = simplifyPoints(points, smoothness * 0.8);
    const resampled = resamplePoints(sampled, Math.max(1.5, 4 - smoothness));
    const closed = this.shouldClose(points);
    return pointsToSmoothPath(resampled, closed);
  }

  private shouldClose(points: IPointData[]) {
    if (points.length < 4) return false;
    const start = points[0];
    const end = points[points.length - 1];
    return distance(start, end) < 24;
  }
}
