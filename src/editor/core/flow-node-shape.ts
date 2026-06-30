/**
 * Shared utilities for creating and resizing flow node shapes.
 * Used by DrawFlowNode (interactive drawing), do-template (batch insertion),
 * and useEditorPanelState (property-panel resize).
 */
import { Ellipse, Path, Rect, type IUI } from "leafer";

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

/** Property key that stores the FlowNodeKind on the inner shape element. */
export const FLOW_SHAPE_KIND_PROP = "__flowShapeKind";

export interface FlowNodeShapeStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    cornerRadius?: number;
}

/** Read the stored FlowNodeKind from an inner shape element. */
export function getFlowShapeKind(shape: IUI): FlowNodeKind | undefined {
    return (shape as unknown as Record<string, unknown>)[FLOW_SHAPE_KIND_PROP] as
        | FlowNodeKind
        | undefined;
}

/** Create the inner shape element for a flow node and tag it with its kind. */
export function createFlowNodeShape(
    kind: FlowNodeKind,
    style: FlowNodeShapeStyle = {},
): IUI {
    const base = {
        editable: false,
        fill: style.fill ?? "#ffffff",
        stroke: style.stroke ?? "#2563eb",
        strokeWidth: style.strokeWidth ?? 2,
        opacity: style.opacity ?? 1,
    };

    let shape: IUI;

    if (
        kind === "startEnd" ||
        kind === "connector" ||
        kind === "bpmnStartEvent" ||
        kind === "bpmnIntermediateEvent" ||
        kind === "bpmnEndEvent" ||
        kind === "archUseCase"
    ) {
        shape = new Ellipse(base);
    } else if (
        kind === "decision" ||
        kind === "io" ||
        kind === "document" ||
        kind === "database" ||
        kind === "subprocess" ||
        kind === "swimlane" ||
        kind === "delay" ||
        kind === "preparation" ||
        kind === "manualInput" ||
        kind === "manualOperation" ||
        kind === "storedData" ||
        kind === "display" ||
        kind === "offPage" ||
        kind === "merge" ||
        kind === "annotation" ||
        kind === "triangle" ||
        kind === "pentagon" ||
        kind === "hexagon" ||
        kind === "parallelogram" ||
        kind === "star" ||
        kind === "note" ||
        kind === "cylinder" ||
        kind === "bpmnExclusiveGateway" ||
        kind === "bpmnParallelGateway" ||
        kind === "bpmnInclusiveGateway" ||
        kind === "bpmnDataObject" ||
        kind === "bpmnDataStore" ||
        kind === "archActor" ||
        kind === "archComponent" ||
        kind === "archPackage" ||
        kind === "archNode" ||
        kind === "archQueue" ||
        kind === "archCache" ||
        kind === "archCloud" ||
        kind === "archService" ||
        kind === "archDevice"
    ) {
        shape = new Path(base);
    } else {
        // process, bpmnTask, and other rectangle-based kinds
        shape = new Rect({ ...base, cornerRadius: style.cornerRadius ?? 6 });
    }

    (shape as unknown as Record<string, unknown>)[FLOW_SHAPE_KIND_PROP] = kind;
    return shape;
}

/** Update the inner shape element dimensions/path when the node is resized. */
export function updateFlowNodeShape(
    shape: IUI,
    kind: FlowNodeKind,
    width: number,
    height: number,
): void {
    if (kind === "decision") {
        (shape as Path).path = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`;
        return;
    }

    if (kind === "io") {
        const offset = Math.min(28, width * 0.18);
        (shape as Path).path = `M ${offset} 0 L ${width} 0 L ${width - offset} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "document") {
        const wave = Math.min(18, height * 0.18);
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width} ${height - wave} Q ${width * 0.75} ${height + wave} ${width * 0.5} ${height - wave / 2} Q ${width * 0.25} ${height - wave * 1.5} 0 ${height - wave / 2} Z`;
        return;
    }

    if (kind === "database") {
        const ry = Math.min(18, height * 0.18);
        (shape as Path).path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
        return;
    }

    if (kind === "subprocess") {
        const inset = Math.min(14, width * 0.12);
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M ${inset} 0 L ${inset} ${height} M ${width - inset} 0 L ${width - inset} ${height}`;
        return;
    }

    if (kind === "swimlane") {
        const header = Math.min(40, Math.max(24, height * 0.22));
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M 0 ${header} L ${width} ${header}`;
        return;
    }

    if (kind === "delay") {
        const r = Math.min(width * 0.45, height / 2);
        (shape as Path).path = `M 0 0 L ${width - r} 0 Q ${width} 0 ${width} ${height / 2} Q ${width} ${height} ${width - r} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "preparation") {
        const inset = Math.min(28, width * 0.18);
        (shape as Path).path = `M ${inset} 0 L ${width - inset} 0 L ${width} ${height / 2} L ${width - inset} ${height} L ${inset} ${height} L 0 ${height / 2} Z`;
        return;
    }

    if (kind === "manualInput") {
        const slant = Math.min(24, height * 0.35);
        (shape as Path).path = `M 0 ${slant} L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "manualOperation") {
        const inset = Math.min(24, width * 0.18);
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width - inset} ${height} L ${inset} ${height} Z`;
        return;
    }

    if (kind === "storedData") {
        const curve = Math.min(22, width * 0.18);
        (shape as Path).path = `M ${curve} 0 L ${width} 0 Q ${width - curve} ${height / 2} ${width} ${height} L ${curve} ${height} Q 0 ${height / 2} ${curve} 0 Z`;
        return;
    }

    if (kind === "display") {
        const nose = Math.min(30, width * 0.2);
        (shape as Path).path = `M 0 0 L ${width - nose} 0 Q ${width} ${height / 2} ${width - nose} ${height} L 0 ${height} Q ${nose} ${height / 2} 0 0 Z`;
        return;
    }

    if (kind === "offPage") {
        const fold = Math.min(28, height * 0.28);
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width} ${height - fold} L ${width / 2} ${height} L 0 ${height - fold} Z`;
        return;
    }

    if (kind === "merge") {
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width / 2} ${height} Z`;
        return;
    }

    if (kind === "annotation") {
        const hook = Math.min(18, width * 0.18);
        (shape as Path).path = `M ${hook} 0 L 0 0 L 0 ${height} L ${hook} ${height} M 0 ${height / 2} L ${width} ${height / 2}`;
        return;
    }

    if (kind === "triangle") {
        (shape as Path).path = `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "pentagon") {
        (shape as Path).path = `M ${width / 2} 0 L ${width} ${height * 0.38} L ${width * 0.82} ${height} L ${width * 0.18} ${height} L 0 ${height * 0.38} Z`;
        return;
    }

    if (kind === "hexagon") {
        const inset = Math.min(32, width * 0.22);
        (shape as Path).path = `M ${inset} 0 L ${width - inset} 0 L ${width} ${height / 2} L ${width - inset} ${height} L ${inset} ${height} L 0 ${height / 2} Z`;
        return;
    }

    if (kind === "parallelogram") {
        const offset = Math.min(28, width * 0.2);
        (shape as Path).path = `M ${offset} 0 L ${width} 0 L ${width - offset} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "star") {
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
        (shape as Path).path = `${points.join(" ")} Z`;
        return;
    }

    if (kind === "note") {
        const fold = Math.min(24, width * 0.24, height * 0.3);
        (shape as Path).path = `M 0 0 L ${width - fold} 0 L ${width} ${fold} L ${width} ${height} L 0 ${height} Z M ${width - fold} 0 L ${width - fold} ${fold} L ${width} ${fold}`;
        return;
    }

    if (kind === "cylinder") {
        const ry = Math.min(18, height * 0.18);
        (shape as Path).path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
        return;
    }

    if (kind === "bpmnIntermediateEvent") {
        shape.width = width;
        shape.height = height;
        return;
    }

    if (
        kind === "bpmnStartEvent" ||
        kind === "bpmnEndEvent" ||
        kind === "archUseCase"
    ) {
        shape.width = width;
        shape.height = height;
        return;
    }

    if (
        kind === "bpmnExclusiveGateway" ||
        kind === "bpmnParallelGateway" ||
        kind === "bpmnInclusiveGateway"
    ) {
        const baseDiamond = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`;
        if (kind === "bpmnExclusiveGateway") {
            const s = Math.min(width, height) * 0.22;
            const cx = width / 2;
            const cy = height / 2;
            (shape as Path).path = `${baseDiamond} M ${cx - s} ${cy - s} L ${cx + s} ${cy + s} M ${cx + s} ${cy - s} L ${cx - s} ${cy + s}`;
        } else if (kind === "bpmnParallelGateway") {
            const s = Math.min(width, height) * 0.26;
            (shape as Path).path = `${baseDiamond} M ${width / 2} ${height / 2 - s} L ${width / 2} ${height / 2 + s} M ${width / 2 - s} ${height / 2} L ${width / 2 + s} ${height / 2}`;
        } else {
            const r = Math.min(width, height) * 0.22;
            (shape as Path).path = `${baseDiamond} M ${width / 2 - r} ${height / 2} A ${r} ${r} 0 1 0 ${width / 2 + r} ${height / 2} A ${r} ${r} 0 1 0 ${width / 2 - r} ${height / 2}`;
        }
        return;
    }

    if (kind === "bpmnDataObject") {
        const fold = Math.min(22, width * 0.22, height * 0.28);
        (shape as Path).path = `M 0 0 L ${width - fold} 0 L ${width} ${fold} L ${width} ${height} L 0 ${height} Z M ${width - fold} 0 L ${width - fold} ${fold} L ${width} ${fold}`;
        return;
    }

    if (kind === "bpmnDataStore" || kind === "archCache") {
        const ry = Math.min(18, height * 0.18);
        (shape as Path).path = `M 0 ${ry} Q ${width / 2} 0 ${width} ${ry} L ${width} ${height - ry} Q ${width / 2} ${height} 0 ${height - ry} Z M 0 ${ry} Q ${width / 2} ${ry * 2} ${width} ${ry}`;
        return;
    }

    if (kind === "archActor") {
        const headR = Math.min(width, height) * 0.16;
        const cx = width / 2;
        const headY = headR + 2;
        const bodyTop = headY + headR;
        const bodyBottom = height * 0.68;
        const armY = height * 0.42;
        const legY = height - 2;
        (shape as Path).path = `M ${cx - headR} ${headY} A ${headR} ${headR} 0 1 0 ${cx + headR} ${headY} A ${headR} ${headR} 0 1 0 ${cx - headR} ${headY} M ${cx} ${bodyTop} L ${cx} ${bodyBottom} M ${cx - width * 0.28} ${armY} L ${cx + width * 0.28} ${armY} M ${cx} ${bodyBottom} L ${cx - width * 0.22} ${legY} M ${cx} ${bodyBottom} L ${cx + width * 0.22} ${legY}`;
        return;
    }

    if (kind === "archComponent") {
        const tabW = Math.min(18, width * 0.18);
        const tabH = Math.min(12, height * 0.18);
        (shape as Path).path = `M ${tabW} 0 L ${width} 0 L ${width} ${height} L ${tabW} ${height} Z M 0 ${height * 0.22} L ${tabW} ${height * 0.22} L ${tabW} ${height * 0.22 + tabH} L 0 ${height * 0.22 + tabH} Z M 0 ${height * 0.58} L ${tabW} ${height * 0.58} L ${tabW} ${height * 0.58 + tabH} L 0 ${height * 0.58 + tabH} Z`;
        return;
    }

    if (kind === "archPackage") {
        const tabW = Math.min(width * 0.38, 64);
        const tabH = Math.min(height * 0.24, 26);
        (shape as Path).path = `M 0 ${tabH} L 0 0 L ${tabW} 0 L ${tabW + 10} ${tabH} L ${width} ${tabH} L ${width} ${height} L 0 ${height} Z`;
        return;
    }

    if (kind === "archNode") {
        const depth = Math.min(18, width * 0.12, height * 0.18);
        (shape as Path).path = `M 0 ${depth} L ${depth} 0 L ${width} 0 L ${width} ${height - depth} L ${width - depth} ${height} L 0 ${height} Z M 0 ${depth} L ${width - depth} ${depth} L ${width} 0 M ${width - depth} ${depth} L ${width - depth} ${height} `;
        return;
    }

    if (kind === "archQueue") {
        const r = Math.min(18, width * 0.12);
        (shape as Path).path = `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${height / 2} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height / 2} Q 0 0 ${r} 0 Z M ${r} 0 Q ${r * 2} ${height / 2} ${r} ${height}`;
        return;
    }

    if (kind === "archCloud") {
        (shape as Path).path = `M ${width * 0.22} ${height * 0.65} Q ${width * 0.02} ${height * 0.62} ${width * 0.12} ${height * 0.42} Q ${width * 0.18} ${height * 0.2} ${width * 0.42} ${height * 0.28} Q ${width * 0.55} ${height * 0.05} ${width * 0.74} ${height * 0.28} Q ${width * 0.96} ${height * 0.28} ${width * 0.9} ${height * 0.55} Q ${width * 0.84} ${height * 0.78} ${width * 0.58} ${height * 0.72} L ${width * 0.22} ${height * 0.65} Z`;
        return;
    }

    if (kind === "archService") {
        const r = Math.min(8, width * 0.08, height * 0.12);
        (shape as Path).path = `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z M ${width * 0.18} ${height * 0.28} L ${width * 0.82} ${height * 0.28} M ${width * 0.18} ${height * 0.5} L ${width * 0.82} ${height * 0.5} M ${width * 0.18} ${height * 0.72} L ${width * 0.62} ${height * 0.72}`;
        return;
    }

    if (kind === "archDevice") {
        const baseH = Math.min(12, height * 0.16);
        (shape as Path).path = `M 0 0 L ${width} 0 L ${width} ${height - baseH} L 0 ${height - baseH} Z M ${width * 0.38} ${height - baseH} L ${width * 0.62} ${height - baseH} L ${width * 0.72} ${height} L ${width * 0.28} ${height} Z`;
        return;
    }

    // Ellipse and Rect kinds (startEnd, connector, process, bpmnTask, etc.)
    shape.width = width;
    shape.height = height;
}
