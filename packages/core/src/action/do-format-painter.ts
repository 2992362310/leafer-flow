import type { DocumentEdge, DocumentNode } from "../document/model";
import type Editor from "../editor";
import { FLOW_NODE_DOCUMENT_TYPE } from "../core/builtin-node-types";

interface StyleSnapshot {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    cornerRadius?: number;
    dashPattern?: number[];
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
    textColor?: string;
}

let copiedStyle: StyleSnapshot | null = null;

export function doFormatPainterCopy(editor: Editor): { success: boolean; message: string } {
    const selected = editor.app.editor.list ?? [];
    if (!selected.length) return { success: false, message: "请先选中一个元素" };
    const id = editor.renderer.getId(selected[0]!);
    const document = editor.document.snapshot();
    const node = findNode(document.nodes, id);
    const edge = document.edges.find((item) => item.id === id);
    copiedStyle = readStyle(node, edge);
    return { success: true, message: "已复制样式" };
}

export function doFormatPainterApply(editor: Editor): { success: boolean; message: string } {
    if (!copiedStyle) return { success: false, message: "请先复制样式（Ctrl+Shift+C）" };
    const selected = editor.app.editor.list ?? [];
    if (!selected.length) return { success: false, message: "请先选中要应用样式的元素" };
    const patch = {
        fill: copiedStyle.fill,
        stroke: copiedStyle.stroke,
        stroke_width: copiedStyle.strokeWidth,
        opacity: copiedStyle.opacity,
        corner_radius: copiedStyle.cornerRadius,
        dash_pattern: copiedStyle.dashPattern,
        font_size: copiedStyle.fontSize,
        font_weight: copiedStyle.fontWeight,
        font_style: copiedStyle.fontStyle,
        text_align: copiedStyle.textAlign,
        text_color: copiedStyle.textColor,
    };
    editor.documentCommands.updatePresentation(selected.map((item) => editor.renderer.getId(item)), patch);
    return { success: true, message: `已应用样式到 ${selected.length} 个元素` };
}

function findNode(nodes: DocumentNode[], id: string): DocumentNode | undefined {
    for (const node of nodes) {
        if (node.id === id) return node;
        const child = findNode(node.children, id);
        if (child) return child;
    }
}

function findShape(node: DocumentNode): DocumentNode | undefined {
    if (node.type === FLOW_NODE_DOCUMENT_TYPE || node.type === "Text") return node;
    if (!["Group", "Box", "Frame"].includes(node.type)) return node;
    for (const child of node.children) {
        const shape = findShape(child);
        if (shape) return shape;
    }
}

function findText(node: DocumentNode): DocumentNode | undefined {
    if (node.type === "Text" || node.type === FLOW_NODE_DOCUMENT_TYPE) return node;
    for (const child of node.children) {
        const text = findText(child);
        if (text) return text;
    }
}

function readStyle(node?: DocumentNode, edge?: DocumentEdge): StyleSnapshot {
    if (edge) {
        return {
            stroke: typeof edge.data.stroke === "string" ? edge.data.stroke : undefined,
            strokeWidth: typeof edge.data.strokeWidth === "number" ? edge.data.strokeWidth : undefined,
            dashPattern: Array.isArray(edge.data.dashPattern) ? edge.data.dashPattern as number[] : undefined,
        };
    }
    if (!node) return {};
    const shape = findShape(node);
    const text = findText(node);
    const shapeData = shape?.type === FLOW_NODE_DOCUMENT_TYPE && shape.data.style && typeof shape.data.style === "object"
        ? shape.data.style as Record<string, unknown> : shape?.data;
    return {
        fill: typeof shapeData?.fill === "string" ? shapeData.fill : undefined,
        stroke: typeof shapeData?.stroke === "string" ? shapeData.stroke : undefined,
        strokeWidth: typeof shapeData?.strokeWidth === "number" ? shapeData.strokeWidth : undefined,
        opacity: typeof shapeData?.opacity === "number" ? shapeData.opacity : undefined,
        cornerRadius: typeof shapeData?.cornerRadius === "number" ? shapeData.cornerRadius : undefined,
        dashPattern: Array.isArray(shapeData?.dashPattern) ? shapeData.dashPattern as number[] : undefined,
        fontSize: typeof text?.data.fontSize === "number" ? text.data.fontSize : undefined,
        fontWeight: typeof text?.data.fontWeight === "string" ? text.data.fontWeight : undefined,
        fontStyle: typeof text?.data.fontStyle === "string" ? text.data.fontStyle : undefined,
        textAlign: typeof text?.data.textAlign === "string" ? text.data.textAlign : undefined,
        textColor: typeof text?.data.fill === "string" ? text.data.fill
            : typeof text?.data.textColor === "string" ? text.data.textColor : undefined,
    };
}
