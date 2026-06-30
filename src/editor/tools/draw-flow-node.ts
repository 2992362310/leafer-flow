import { Ellipse, Group, Path, Rect, Text, type IPointData, type IUI } from "leafer";
import type { IDrawOptions, IDrawResult } from "../types";
import { makeGroupSelectionAtomic } from "../core/group-selection";
import { DrawBase } from "./draw-base";

export type FlowNodeKind =
  | "startEnd"
  | "process"
  | "decision"
  | "io"
  | "document"
  | "database"
  | "subprocess"
  | "connector"
  | "swimlane"
  | "delay"
  | "preparation"
  | "manualInput"
  | "manualOperation"
  | "storedData"
  | "display"
  | "offPage"
  | "merge"
  | "annotation"
  | "triangle"
  | "pentagon"
  | "hexagon"
  | "parallelogram"
  | "star"
  | "note"
  | "cylinder"
  | "bpmnStartEvent"
  | "bpmnIntermediateEvent"
  | "bpmnEndEvent"
  | "bpmnExclusiveGateway"
  | "bpmnParallelGateway"
  | "bpmnInclusiveGateway"
  | "bpmnTask"
  | "bpmnDataObject"
  | "bpmnDataStore"
  | "archActor"
  | "archUseCase"
  | "archComponent"
  | "archPackage"
  | "archNode"
  | "archQueue"
  | "archCache"
  | "archCloud"
  | "archService"
  | "archDevice";

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
    const shape = this.createShape();
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

    this.updateShape(children[0] as IUI, bounds.width, bounds.height);

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

  private createShape(): IUI {
    const base = {
      editable: false,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    };

    if (this.options.kind === "startEnd" || this.options.kind === "connector") {
      return new Ellipse(base);
    }

    if (
      this.options.kind === "bpmnStartEvent" ||
      this.options.kind === "bpmnIntermediateEvent" ||
      this.options.kind === "bpmnEndEvent" ||
      this.options.kind === "archUseCase"
    ) {
      return new Ellipse(base);
    }

    if (
      this.options.kind === "decision" ||
      this.options.kind === "io" ||
      this.options.kind === "document" ||
      this.options.kind === "database" ||
      this.options.kind === "subprocess" ||
      this.options.kind === "swimlane" ||
      this.options.kind === "delay" ||
      this.options.kind === "preparation" ||
      this.options.kind === "manualInput" ||
      this.options.kind === "manualOperation" ||
      this.options.kind === "storedData" ||
      this.options.kind === "display" ||
      this.options.kind === "offPage" ||
      this.options.kind === "merge" ||
      this.options.kind === "annotation" ||
      this.options.kind === "triangle" ||
      this.options.kind === "pentagon" ||
      this.options.kind === "hexagon" ||
      this.options.kind === "parallelogram" ||
      this.options.kind === "star" ||
      this.options.kind === "note" ||
      this.options.kind === "cylinder" ||
      this.options.kind === "bpmnExclusiveGateway" ||
      this.options.kind === "bpmnParallelGateway" ||
      this.options.kind === "bpmnInclusiveGateway" ||
      this.options.kind === "bpmnDataObject" ||
      this.options.kind === "bpmnDataStore" ||
      this.options.kind === "archActor" ||
      this.options.kind === "archComponent" ||
      this.options.kind === "archPackage" ||
      this.options.kind === "archNode" ||
      this.options.kind === "archQueue" ||
      this.options.kind === "archCache" ||
      this.options.kind === "archCloud" ||
      this.options.kind === "archService" ||
      this.options.kind === "archDevice"
    ) {
      return new Path(base);
    }

    return new Rect({
      ...base,
      cornerRadius: this.options.cornerRadius ?? 6,
    });
  }

  private updateShape(shape: IUI, width: number, height: number) {
    if (this.options.kind === "decision") {
      const path = shape as Path;
      path.path = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`;
      return;
    }

    if (this.options.kind === "io") {
      const offset = Math.min(28, width * 0.18);
      const path = shape as Path;
      path.path = `M ${offset} 0 L ${width} 0 L ${width - offset} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "document") {
      const wave = Math.min(18, height * 0.18);
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width} ${height - wave} Q ${width * 0.75} ${height + wave} ${width * 0.5} ${height - wave / 2} Q ${width * 0.25} ${height - wave * 1.5} 0 ${height - wave / 2} Z`;
      return;
    }

    if (this.options.kind === "database") {
      const ry = Math.min(18, height * 0.18);
      const path = shape as Path;
      path.path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
      return;
    }

    if (this.options.kind === "subprocess") {
      const inset = Math.min(14, width * 0.12);
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M ${inset} 0 L ${inset} ${height} M ${width - inset} 0 L ${width - inset} ${height}`;
      return;
    }

    if (this.options.kind === "swimlane") {
      const header = Math.min(40, Math.max(24, height * 0.22));
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M 0 ${header} L ${width} ${header}`;
      return;
    }

    if (this.options.kind === "delay") {
      const r = Math.min(width * 0.45, height / 2);
      const path = shape as Path;
      path.path = `M 0 0 L ${width - r} 0 Q ${width} 0 ${width} ${height / 2} Q ${width} ${height} ${width - r} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "preparation") {
      const inset = Math.min(28, width * 0.18);
      const path = shape as Path;
      path.path = `M ${inset} 0 L ${width - inset} 0 L ${width} ${height / 2} L ${width - inset} ${height} L ${inset} ${height} L 0 ${height / 2} Z`;
      return;
    }

    if (this.options.kind === "manualInput") {
      const slant = Math.min(24, height * 0.35);
      const path = shape as Path;
      path.path = `M 0 ${slant} L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "manualOperation") {
      const inset = Math.min(24, width * 0.18);
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width - inset} ${height} L ${inset} ${height} Z`;
      return;
    }

    if (this.options.kind === "storedData") {
      const curve = Math.min(22, width * 0.18);
      const path = shape as Path;
      path.path = `M ${curve} 0 L ${width} 0 Q ${width - curve} ${height / 2} ${width} ${height} L ${curve} ${height} Q 0 ${height / 2} ${curve} 0 Z`;
      return;
    }

    if (this.options.kind === "display") {
      const nose = Math.min(30, width * 0.2);
      const path = shape as Path;
      path.path = `M 0 0 L ${width - nose} 0 Q ${width} ${height / 2} ${width - nose} ${height} L 0 ${height} Q ${nose} ${height / 2} 0 0 Z`;
      return;
    }

    if (this.options.kind === "offPage") {
      const fold = Math.min(28, height * 0.28);
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width} ${height - fold} L ${width / 2} ${height} L 0 ${height - fold} Z`;
      return;
    }

    if (this.options.kind === "merge") {
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width / 2} ${height} Z`;
      return;
    }

    if (this.options.kind === "annotation") {
      const hook = Math.min(18, width * 0.18);
      const path = shape as Path;
      path.path = `M ${hook} 0 L 0 0 L 0 ${height} L ${hook} ${height} M 0 ${height / 2} L ${width} ${height / 2}`;
      return;
    }

    if (this.options.kind === "triangle") {
      const path = shape as Path;
      path.path = `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "pentagon") {
      const path = shape as Path;
      path.path = `M ${width / 2} 0 L ${width} ${height * 0.38} L ${width * 0.82} ${height} L ${width * 0.18} ${height} L 0 ${height * 0.38} Z`;
      return;
    }

    if (this.options.kind === "hexagon") {
      const inset = Math.min(32, width * 0.22);
      const path = shape as Path;
      path.path = `M ${inset} 0 L ${width - inset} 0 L ${width} ${height / 2} L ${width - inset} ${height} L ${inset} ${height} L 0 ${height / 2} Z`;
      return;
    }

    if (this.options.kind === "parallelogram") {
      const offset = Math.min(28, width * 0.2);
      const path = shape as Path;
      path.path = `M ${offset} 0 L ${width} 0 L ${width - offset} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "star") {
      const cx = width / 2;
      const cy = height / 2;
      const outer = Math.min(width, height) * 0.48;
      const inner = outer * 0.45;
      const points: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const angle = (-90 + i * 36) * (Math.PI / 180);
        const radius = i % 2 === 0 ? outer : inner;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
      }
      const path = shape as Path;
      path.path = `${points.join(" ")} Z`;
      return;
    }

    if (this.options.kind === "note") {
      const fold = Math.min(24, width * 0.24, height * 0.3);
      const path = shape as Path;
      path.path = `M 0 0 L ${width - fold} 0 L ${width} ${fold} L ${width} ${height} L 0 ${height} Z M ${width - fold} 0 L ${width - fold} ${fold} L ${width} ${fold}`;
      return;
    }

    if (this.options.kind === "cylinder") {
      const ry = Math.min(18, height * 0.18);
      const path = shape as Path;
      path.path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
      return;
    }

    if (this.options.kind === "bpmnIntermediateEvent") {
      shape.width = width;
      shape.height = height;
      const ellipse = shape as Ellipse;
      ellipse.strokeWidth = this.options.strokeWidth ?? 2;
      return;
    }

    if (
      this.options.kind === "bpmnStartEvent" ||
      this.options.kind === "bpmnEndEvent" ||
      this.options.kind === "archUseCase"
    ) {
      shape.width = width;
      shape.height = height;
      return;
    }

    if (
      this.options.kind === "bpmnExclusiveGateway" ||
      this.options.kind === "bpmnParallelGateway" ||
      this.options.kind === "bpmnInclusiveGateway"
    ) {
      const path = shape as Path;
      const baseDiamond = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`;
      if (this.options.kind === "bpmnExclusiveGateway") {
        const s = Math.min(width, height) * 0.22;
        const cx = width / 2;
        const cy = height / 2;
        path.path = `${baseDiamond} M ${cx - s} ${cy - s} L ${cx + s} ${cy + s} M ${cx + s} ${cy - s} L ${cx - s} ${cy + s}`;
      } else if (this.options.kind === "bpmnParallelGateway") {
        const s = Math.min(width, height) * 0.26;
        path.path = `${baseDiamond} M ${width / 2} ${height / 2 - s} L ${width / 2} ${height / 2 + s} M ${width / 2 - s} ${height / 2} L ${width / 2 + s} ${height / 2}`;
      } else {
        const r = Math.min(width, height) * 0.22;
        path.path = `${baseDiamond} M ${width / 2 - r} ${height / 2} A ${r} ${r} 0 1 0 ${width / 2 + r} ${height / 2} A ${r} ${r} 0 1 0 ${width / 2 - r} ${height / 2}`;
      }
      return;
    }

    if (this.options.kind === "bpmnDataObject") {
      const fold = Math.min(22, width * 0.22, height * 0.28);
      const path = shape as Path;
      path.path = `M 0 0 L ${width - fold} 0 L ${width} ${fold} L ${width} ${height} L 0 ${height} Z M ${width - fold} 0 L ${width - fold} ${fold} L ${width} ${fold}`;
      return;
    }

    if (this.options.kind === "bpmnDataStore" || this.options.kind === "archCache") {
      const ry = Math.min(18, height * 0.18);
      const path = shape as Path;
      path.path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
      return;
    }

    if (this.options.kind === "archActor") {
      const headR = Math.min(width, height) * 0.16;
      const cx = width / 2;
      const headY = headR + 2;
      const bodyTop = headY + headR;
      const bodyBottom = height * 0.68;
      const armY = height * 0.42;
      const legY = height - 2;
      const path = shape as Path;
      path.path = `M ${cx - headR} ${headY} A ${headR} ${headR} 0 1 0 ${cx + headR} ${headY} A ${headR} ${headR} 0 1 0 ${cx - headR} ${headY} M ${cx} ${bodyTop} L ${cx} ${bodyBottom} M ${cx - width * 0.28} ${armY} L ${cx + width * 0.28} ${armY} M ${cx} ${bodyBottom} L ${cx - width * 0.22} ${legY} M ${cx} ${bodyBottom} L ${cx + width * 0.22} ${legY}`;
      return;
    }

    if (this.options.kind === "archComponent") {
      const tabW = Math.min(18, width * 0.18);
      const tabH = Math.min(12, height * 0.18);
      const path = shape as Path;
      path.path = `M ${tabW} 0 L ${width} 0 L ${width} ${height} L ${tabW} ${height} Z M 0 ${height * 0.22} L ${tabW} ${height * 0.22} L ${tabW} ${height * 0.22 + tabH} L 0 ${height * 0.22 + tabH} Z M 0 ${height * 0.58} L ${tabW} ${height * 0.58} L ${tabW} ${height * 0.58 + tabH} L 0 ${height * 0.58 + tabH} Z`;
      return;
    }

    if (this.options.kind === "archPackage") {
      const tabW = Math.min(width * 0.38, 64);
      const tabH = Math.min(height * 0.24, 26);
      const path = shape as Path;
      path.path = `M 0 ${tabH} L 0 0 L ${tabW} 0 L ${tabW + 10} ${tabH} L ${width} ${tabH} L ${width} ${height} L 0 ${height} Z`;
      return;
    }

    if (this.options.kind === "archNode") {
      const depth = Math.min(18, width * 0.12, height * 0.18);
      const path = shape as Path;
      path.path = `M 0 ${depth} L ${depth} 0 L ${width} 0 L ${width} ${height - depth} L ${width - depth} ${height} L 0 ${height} Z M 0 ${depth} L ${width - depth} ${depth} L ${width} 0 M ${width - depth} ${depth} L ${width - depth} ${height} `;
      return;
    }

    if (this.options.kind === "archQueue") {
      const r = Math.min(18, width * 0.12);
      const path = shape as Path;
      path.path = `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${height / 2} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height / 2} Q 0 0 ${r} 0 Z M ${r} 0 Q ${r * 2} ${height / 2} ${r} ${height}`;
      return;
    }

    if (this.options.kind === "archCloud") {
      const path = shape as Path;
      path.path = `M ${width * 0.22} ${height * 0.65} Q ${width * 0.02} ${height * 0.62} ${width * 0.12} ${height * 0.42} Q ${width * 0.18} ${height * 0.2} ${width * 0.42} ${height * 0.28} Q ${width * 0.55} ${height * 0.05} ${width * 0.74} ${height * 0.28} Q ${width * 0.96} ${height * 0.28} ${width * 0.9} ${height * 0.55} Q ${width * 0.84} ${height * 0.78} ${width * 0.58} ${height * 0.72} L ${width * 0.22} ${height * 0.65} Z`;
      return;
    }

    if (this.options.kind === "archService") {
      const r = Math.min(8, width * 0.08, height * 0.12);
      const path = shape as Path;
      path.path = `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z M ${width * 0.18} ${height * 0.28} L ${width * 0.82} ${height * 0.28} M ${width * 0.18} ${height * 0.5} L ${width * 0.82} ${height * 0.5} M ${width * 0.18} ${height * 0.72} L ${width * 0.62} ${height * 0.72}`;
      return;
    }

    if (this.options.kind === "archDevice") {
      const baseH = Math.min(12, height * 0.16);
      const path = shape as Path;
      path.path = `M 0 0 L ${width} 0 L ${width} ${height - baseH} L 0 ${height - baseH} Z M ${width * 0.38} ${height - baseH} L ${width * 0.62} ${height - baseH} L ${width * 0.72} ${height} L ${width * 0.28} ${height} Z`;
      return;
    }

    shape.width = width;
    shape.height = height;
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
