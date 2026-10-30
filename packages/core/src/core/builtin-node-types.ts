import type { NodeTypeRegistry } from "./node-type-registry";
import type { JsonObject } from "../document/model";
import { createFlowGraphNode } from "./flow-graph-view";
import { FLOW_BOX_SIZE_PROP, FLOW_SHAPE_KIND_PROP, type FlowNodeKind } from "./flow-node-shape";
import type { FlowGraphNode, FlowGraphNodeStyle } from "./flow-graph";
import type { IUI } from "leafer";
import { toLeaferImageFilters } from "../document/image-filters";

export const FLOW_NODE_DOCUMENT_TYPE = "leafer-flow.flow-node";

export function registerBuiltinNodeTypes(registry: NodeTypeRegistry) {
    for (const type of ["UI", "Group", "Box", "Frame", "Rect", "Ellipse", "Polygon", "Star", "Line", "Path", "Text", "Image", "Video", "Audio"]) {
        registry.register({
            type,
            version: 1,
            label: type,
            acceptsChildren: ["Group", "Box", "Frame"].includes(type),
            render(node, context): JsonObject {
                const data = structuredClone(node.data);
                delete data.customData;
                if (type === "Audio") return {
                    tag: "Group", x: data.x ?? 0, y: data.y ?? 0, width: data.width ?? 240, height: data.height ?? 64,
                    children: [
                        { tag: "Rect", width: data.width ?? 240, height: data.height ?? 64, fill: "#f0fdf4", stroke: "#16a34a", cornerRadius: 6 },
                        { tag: "Text", x: 12, y: 20, width: Number(data.width ?? 240) - 24, text: String(data.name ?? "Audio"), fontSize: 14, fill: "#14532d", textAlign: "center" },
                    ],
                };
                if (type === "Image" || type === "Video") {
                    delete data.poster;
                    const filters = type === "Image" ? toLeaferImageFilters(data.imageFilters) : [];
                    if (type === "Image") delete data.imageFilters;
                    if (typeof data.assetId === "string") {
                        const url = context.resolveAsset(data.assetId);
                        if (filters.length) {
                            data.fill = { type: "image", url, mode: "stretch", filter: filters };
                            delete data.url;
                        } else {
                            data.url = type === "Video" ? `${url}#${node.id}` : url;
                        }
                    }
                    delete data.assetId;
                }
                return { ...data, tag: type };
            },
            read: type === "Video" || type === "Audio" ? (_view, previous) => structuredClone(previous) : (view, previous) => ({ ...previous, ...view }),
        });
    }
    registry.register({
        type: FLOW_NODE_DOCUMENT_TYPE,
        version: 1,
        label: "流程图节点",
        acceptsChildren: true,
        defaults: { kind: "process", text: "处理", x: 0, y: 0, width: 140, height: 56, style: { fill: "#eff6ff", stroke: "#2563eb", strokeWidth: 2 } },
        validate(data) {
            if (typeof data.kind !== "string" || typeof data.text !== "string") throw new Error("Flow node kind and text are required");
            for (const key of ["width", "height"]) if (typeof data[key] !== "number" || !Number.isFinite(data[key]) || data[key] <= 0) throw new Error("Flow node dimensions must be positive");
        },
        render(node) {
            const style = node.data.style && typeof node.data.style === "object" && !Array.isArray(node.data.style)
                ? node.data.style as unknown as FlowGraphNodeStyle : undefined;
            const runtime = createFlowGraphNode({
                id: node.id,
                kind: node.data.kind as FlowNodeKind,
                text: String(node.data.text),
                x: Number(node.data.x),
                y: Number(node.data.y),
                width: Number(node.data.width),
                height: Number(node.data.height),
                ...(style ? { style } : {}),
            } satisfies FlowGraphNode);
            try {
                const view = runtime.toJSON() as JsonObject;
                const children = Array.isArray(view.children) ? view.children as JsonObject[] : [];
                const text = children.find((child) => child.tag === "Text");
                if (text) {
                    if (typeof node.data.fontSize === "number") text.fontSize = node.data.fontSize;
                    if (typeof node.data.textColor === "string") text.fill = node.data.textColor;
                }
                const shape = children.find((child) => child.tag !== "Text");
                const style = node.data.style && typeof node.data.style === "object" && !Array.isArray(node.data.style)
                    ? node.data.style as unknown as JsonObject : {};
                if (shape) {
                    if (typeof style.fill === "string") shape.fill = style.fill;
                    if (typeof style.stroke === "string") shape.stroke = style.stroke;
                    if (typeof style.strokeWidth === "number") shape.strokeWidth = style.strokeWidth;
                    if (typeof style.opacity === "number") shape.opacity = style.opacity;
                    if (typeof style.cornerRadius === "number") shape.cornerRadius = style.cornerRadius;
                }
                return view;
            }
            finally { runtime.destroy(); }
        },
        hydrate(view: IUI, node) {
            const children = (view as IUI & { children?: IUI[] }).children ?? [];
            if (children[0]) (children[0] as IUI & { [FLOW_SHAPE_KIND_PROP]?: FlowNodeKind })[FLOW_SHAPE_KIND_PROP] = node.data.kind as FlowNodeKind;
            (view as IUI & { [FLOW_BOX_SIZE_PROP]?: { width: number; height: number } })[FLOW_BOX_SIZE_PROP] = {
                width: Number(node.data.width), height: Number(node.data.height),
            };
        },
        read(view, previous, runtime) {
            const next = structuredClone(previous);
            const children = Array.isArray(view.children) ? view.children as JsonObject[] : [];
            const text = children.find((child) => child.tag === "Text");
            if (typeof text?.text === "string") next.text = text.text;
            if (typeof text?.fontSize === "number") next.fontSize = text.fontSize;
            if (typeof text?.fill === "string") next.textColor = text.fill;
            const shape = children.find((child) => child.tag !== "Text");
            if (shape) {
                const style = next.style && typeof next.style === "object" && !Array.isArray(next.style)
                    ? next.style as JsonObject : {};
                for (const [viewKey, modelKey] of [["fill", "fill"], ["stroke", "stroke"], ["strokeWidth", "strokeWidth"], ["opacity", "opacity"], ["cornerRadius", "cornerRadius"]]) {
                    const value = shape[viewKey!];
                    if (value !== undefined) style[modelKey!] = value;
                }
                next.style = style;
            }
            const size = (runtime as (IUI & { [FLOW_BOX_SIZE_PROP]?: { width: number; height: number } }) | undefined)?.[FLOW_BOX_SIZE_PROP];
            if (size) { next.width = size.width; next.height = size.height; }
            return next;
        },
    });
}
