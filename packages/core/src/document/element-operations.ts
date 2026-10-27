import type { DocumentEdge, DocumentNode, EditorDocument } from "./model";

export type LayerOrderAction = "bringForward" | "sendBackward" | "bringToFront" | "sendToBack";
export interface ElementStatePatch { locked?: boolean; visible?: boolean }
export type ElementPlacement = "before" | "after" | "inside";
export type AlignAction = "alignLeft" | "alignCenter" | "alignRight" | "alignTop" | "alignMiddle" | "alignBottom" | "distributeHorizontal" | "distributeVertical";
export interface GroupResult { id: string; count: number }
export interface UngroupResult { ids: string[]; count: number }

interface ElementEntry {
    element: DocumentNode | DocumentEdge;
    parentId: string | null;
    ancestors: string[];
}

function indexElements(document: EditorDocument) {
    const entries = new Map<string, ElementEntry>();
    const visit = (nodes: DocumentNode[], ancestors: string[]) => {
        for (const node of nodes) {
            entries.set(node.id, { element: node, parentId: ancestors.at(-1) ?? null, ancestors });
            visit(node.children, [...ancestors, node.id]);
        }
    };
    visit(document.nodes, []);
    for (const edge of document.edges) {
        const parent = edge.parentId ? entries.get(edge.parentId) : undefined;
        entries.set(edge.id, { element: edge, parentId: edge.parentId, ancestors: parent ? [...parent.ancestors, parent.element.id] : [] });
    }
    return entries;
}

function selectedEntries(entries: Map<string, ElementEntry>, ids: string[]) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id.trim())) {
        throw new Error("Document element ids must be non-empty strings");
    }
    return [...new Set(ids)].map((id) => {
        const entry = entries.get(id);
        if (!entry) throw new Error(`Unknown document element: ${id}`);
        return entry;
    });
}

export function moveDocumentElements(document: EditorDocument, ids: string[], dx: number, dy: number): number {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Movement must use finite coordinates");
    if (dx === 0 && dy === 0) return 0;
    const entries = indexElements(document);
    const movable = selectedEntries(entries, ids).filter((entry) =>
        entry.element.data.locked !== true && !entry.ancestors.some((id) => entries.get(id)?.element.data.locked === true));
    const selected = new Set(movable.map((entry) => entry.element.id));
    let count = 0;
    for (const entry of movable) {
        if (entry.ancestors.some((id) => selected.has(id))) continue;
        const element = entry.element;
        if ("type" in element) {
            if (element.label) {
                element.label.offsetX += dx;
                element.label.offsetY += dy;
            } else {
                element.data.x = Number(element.data.x ?? 0) + dx;
                element.data.y = Number(element.data.y ?? 0) + dy;
            }
            count++;
        } else {
            let changed = false;
            for (const endpoint of [element.from, element.to]) {
                if ("nodeId" in endpoint) continue;
                endpoint.x += dx;
                endpoint.y += dy;
                changed = true;
            }
            if (Array.isArray(element.data.waypoints)) {
                for (const point of element.data.waypoints) {
                    if (!point || typeof point !== "object" || Array.isArray(point)) continue;
                    if (typeof point.x !== "number" || typeof point.y !== "number") continue;
                    point.x += dx;
                    point.y += dy;
                    changed = true;
                }
            }
            if (changed) count++;
        }
    }
    return count;
}

export function setDocumentElementState(document: EditorDocument, ids: string[], patch: ElementStatePatch): number {
    for (const value of Object.values(patch)) {
        if (value !== undefined && typeof value !== "boolean") throw new Error("Element state must be boolean");
    }
    let count = 0;
    for (const { element } of selectedEntries(indexElements(document), ids)) {
        let changed = false;
        for (const key of ["locked", "visible"] as const) {
            const value = patch[key];
            if (value === undefined || (element.data[key] ?? (key === "visible")) === value) continue;
            element.data[key] = value;
            changed = true;
        }
        if (changed) count++;
    }
    return count;
}

export function unlockDocumentElements(document: EditorDocument): number {
    const ids = [...indexElements(document).values()]
        .filter(({ element }) => element.data.locked === true)
        .map(({ element }) => element.id);
    return setDocumentElementState(document, ids, { locked: false });
}

export function reorderDocumentElements(document: EditorDocument, ids: string[], action: LayerOrderAction): number {
    if (!["bringForward", "sendBackward", "bringToFront", "sendToBack"].includes(action)) throw new Error("Invalid layer order action");
    const entries = indexElements(document);
    const selection = selectedEntries(entries, ids);
    const selected = new Set(selection.map(({ element }) => element.id));
    const parents = new Set(selection.map((entry) => entry.parentId));
    let moved = 0;
    for (const parentId of parents) {
        const before = [...entries.values()].filter((entry) => entry.parentId === parentId)
            .sort((left, right) => Number(left.element.data.zIndex ?? 0) - Number(right.element.data.zIndex ?? 0));
        let after = [...before];
        if (action === "bringToFront" || action === "sendToBack") {
            const picked = after.filter(({ element }) => selected.has(element.id));
            const rest = after.filter(({ element }) => !selected.has(element.id));
            after = action === "bringToFront" ? [...rest, ...picked] : [...picked, ...rest];
        } else if (action === "bringForward") {
            for (let index = after.length - 2; index >= 0; index--) {
                if (selected.has(after[index].element.id) && !selected.has(after[index + 1].element.id)) {
                    [after[index], after[index + 1]] = [after[index + 1], after[index]];
                }
            }
        } else {
            for (let index = 1; index < after.length; index++) {
                if (selected.has(after[index].element.id) && !selected.has(after[index - 1].element.id)) {
                    [after[index], after[index - 1]] = [after[index - 1], after[index]];
                }
            }
        }
        const changed = after.some((entry, index) => entry !== before[index]);
        if (!changed) continue;
        after.forEach(({ element }, index) => {
            if (selected.has(element.id) && before[index].element.id !== element.id) moved++;
            element.data.zIndex = index;
        });
    }
    return moved;
}

export function placeDocumentElement(document: EditorDocument, id: string, targetId: string, placement: ElementPlacement): boolean {
    if (!["before", "after", "inside"].includes(placement)) throw new Error("Invalid element placement");
    const entries = indexElements(document);
    const [drag, target] = selectedEntries(entries, [id, targetId]);
    if (!target || id === targetId) throw new Error("Cannot move an element onto itself");
    if (target.ancestors.includes(id)) throw new Error("Cannot move an element into its descendant");
    if (placement === "inside" && !("type" in target.element)) throw new Error("An edge cannot contain elements");
    const parentId = placement === "inside" ? targetId : target.parentId;
    const parentOffset = (parent: string | null): { x: number; y: number } => {
        if (!parent) return { x: 0, y: 0 };
        const node = findNode(document.nodes, parent);
        if (!node) throw new Error(`Unknown parent: ${parent}`);
        const inherited = parentOffset(entries.get(parent)?.parentId ?? null);
        return { x: inherited.x + Number(node.data.x ?? 0), y: inherited.y + Number(node.data.y ?? 0) };
    };
    const oldOffset = parentOffset(drag.parentId);
    const newOffset = parentOffset(parentId);
    const before = [...entries.values()].filter((entry) => entry.parentId === parentId)
        .sort((left, right) => Number(left.element.data.zIndex ?? 0) - Number(right.element.data.zIndex ?? 0));
    const after = before.filter((entry) => entry.element.id !== id);
    const position = placement === "inside" ? after.length
        : after.findIndex((entry) => entry.element.id === targetId) + (placement === "after" ? 1 : 0);
    after.splice(position, 0, drag);
    if (drag.parentId === parentId && after.every((entry, index) => entry.element.id === before[index].element.id)) return false;
    if ("type" in drag.element) {
        drag.element.data.x = Number(drag.element.data.x ?? 0) + oldOffset.x - newOffset.x;
        drag.element.data.y = Number(drag.element.data.y ?? 0) + oldOffset.y - newOffset.y;
        const source = drag.parentId ? (entries.get(drag.parentId)!.element as DocumentNode).children : document.nodes;
        source.splice(source.findIndex((node) => node.id === id), 1);
        const destination = parentId ? (entries.get(parentId)!.element as DocumentNode).children : document.nodes;
        destination.push(drag.element);
    } else {
        drag.element.parentId = parentId;
        offsetEdgeGeometry(drag.element, oldOffset.x - newOffset.x, oldOffset.y - newOffset.y);
    }
    after.forEach(({ element }, index) => { element.data.zIndex = index; });
    return true;
}

function findNode(nodes: DocumentNode[], id: string): DocumentNode | undefined {
    for (const node of nodes) {
        if (node.id === id) return node;
        const child = findNode(node.children, id);
        if (child) return child;
    }
}

export function groupDocumentNodes(document: EditorDocument, ids: string[]): GroupResult {
    const entries = indexElements(document);
    const requested = selectedEntries(entries, ids);
    if (requested.some((entry) => entry.element.data.locked === true
        || entry.ancestors.some((ancestor) => entries.get(ancestor)?.element.data.locked === true))) {
        throw new Error("Cannot group locked elements");
    }
    const requestedIds = new Set(requested.map(({ element }) => element.id));
    const selection = requested.filter((entry) => !entry.ancestors.some((ancestor) => requestedIds.has(ancestor)));
    if (selection.some(({ element }) => element.data.locked === true)) throw new Error("Cannot group locked elements");
    if (selection.length < 2) throw new Error("Select at least two elements to group");
    const parentIds = new Set(selection.map((entry) => entry.parentId));
    if (parentIds.size !== 1) throw new Error("Grouped elements must share the same parent");
    const parentId = selection[0].parentId;
    const siblings = parentId ? findNode(document.nodes, parentId)!.children : document.nodes;
    const nodeIds = new Set(selection.filter((entry) => "type" in entry.element).map((entry) => entry.element.id));
    if (!nodeIds.size) throw new Error("At least one node is required to create a group");
    const explicitlySelectedEdges = new Set(selection.filter((entry) => !("type" in entry.element)).map((entry) => entry.element.id));
    const selectedEdges = document.edges.filter((edge) => edge.parentId === parentId
        && (explicitlySelectedEdges.has(edge.id)
            || ("nodeId" in edge.from && "nodeId" in edge.to && nodeIds.has(edge.from.nodeId) && nodeIds.has(edge.to.nodeId))));
    const selectedIds = new Set([...nodeIds, ...selectedEdges.map((edge) => edge.id)]);
    const completeParent = parentId ? findNode(document.nodes, parentId) : undefined;
    if (completeParent?.type === "Group" && completeParent.children.length === nodeIds.size
        && completeParent.children.every((node) => nodeIds.has(node.id))) {
        return { id: completeParent.id, count: nodeIds.size };
    }
    const ordered = [...siblings].sort((a, b) => Number(a.data.zIndex ?? 0) - Number(b.data.zIndex ?? 0));
    const chosen = ordered.filter((node) => nodeIds.has(node.id));
    const coordinates = chosen.flatMap((node) => {
        const x = Number(node.data.x ?? 0); const y = Number(node.data.y ?? 0);
        return [{ x, y }, { x: x + Number(node.data.width ?? 0), y: y + Number(node.data.height ?? 0) }];
    });
    for (const edge of selectedEdges) for (const endpoint of [edge.from, edge.to]) {
        if (!("nodeId" in endpoint)) coordinates.push(endpoint);
    }
    if (!coordinates.length) coordinates.push({ x: 0, y: 0 });
    const x = Math.min(...coordinates.map((point) => point.x));
    const y = Math.min(...coordinates.map((point) => point.y));
    const maxX = Math.max(...coordinates.map((point) => point.x));
    const maxY = Math.max(...coordinates.map((point) => point.y));
    const groupId = crypto.randomUUID();
    for (const node of chosen) {
        node.data.x = Number(node.data.x ?? 0) - x;
        node.data.y = Number(node.data.y ?? 0) - y;
    }
    for (const edge of selectedEdges) offsetEdgeGeometry(edge, -x, -y);
    const group: DocumentNode = {
        id: groupId, type: "Group", version: 1,
        data: { x, y, width: maxX - x, height: maxY - y, editable: true, name: "组合", zIndex: Math.min(...chosen.map((node) => Number(node.data.zIndex ?? 0))) },
        children: chosen,
    };
    for (const edge of selectedEdges) {
        edge.parentId = groupId;
    }
    const rest = ordered.filter((node) => !selectedIds.has(node.id));
    rest.push(group);
    rest.forEach((node, index) => { node.data.zIndex = index; });
    siblings.splice(0, siblings.length, ...rest);
    return { id: groupId, count: selectedIds.size };
}

export function ungroupDocumentNodes(document: EditorDocument, ids: string[]): UngroupResult {
    const entries = indexElements(document);
    const requested = selectedEntries(entries, ids).map((entry) => entry.element)
        .filter((element): element is DocumentNode => "type" in element && element.type === "Group");
    const requestedIds = new Set(requested.map((node) => node.id));
    const groups = requested.filter((node) => !entries.get(node.id)!.ancestors.some((id) => requestedIds.has(id)));
    if (!groups.length) throw new Error("Select at least one group");
    const released: string[] = [];
    for (const group of groups) {
        if (group.data.locked === true || entries.get(group.id)!.ancestors.some((id) => entries.get(id)?.element.data.locked === true)) {
            throw new Error("Cannot ungroup a locked node");
        }
        const parentId = entries.get(group.id)!.parentId;
        const siblings = parentId ? findNode(document.nodes, parentId)!.children : document.nodes;
        const index = siblings.indexOf(group);
        if (index < 0) throw new Error("Group has no parent");
        const dx = Number(group.data.x ?? 0);
        const dy = Number(group.data.y ?? 0);
        const children = group.children;
        children.forEach((node, offset) => {
            node.data.x = Number(node.data.x ?? 0) + dx;
            node.data.y = Number(node.data.y ?? 0) + dy;
            node.data.zIndex = Number(group.data.zIndex ?? index) + offset;
            released.push(node.id);
        });
        for (const edge of document.edges) {
            if (edge.parentId !== group.id) continue;
            edge.parentId = parentId;
            offsetEdgeGeometry(edge, dx, dy);
        }
        siblings.splice(index, 1, ...children);
    }
    const normalize = (nodes: DocumentNode[]) => nodes.forEach((node, index) => {
        node.data.zIndex = index;
        normalize(node.children);
    });
    normalize(document.nodes);
    return { ids: released, count: released.length };
}

function offsetEdgeGeometry(edge: DocumentEdge, dx: number, dy: number) {
    for (const endpoint of [edge.from, edge.to]) {
        if ("nodeId" in endpoint) continue;
        endpoint.x += dx;
        endpoint.y += dy;
    }
    if (!Array.isArray(edge.data.waypoints)) return;
    for (const point of edge.data.waypoints) {
        if (!point || typeof point !== "object" || Array.isArray(point)) continue;
        if (typeof point.x === "number") point.x += dx;
        if (typeof point.y === "number") point.y += dy;
    }
}

export function alignDocumentElements(document: EditorDocument, ids: string[], action: AlignAction): number {
    const entries = indexElements(document);
    const selected = selectedEntries(entries, ids)
        .filter((entry): entry is ElementEntry & { element: DocumentNode } => "type" in entry.element)
        .filter((entry) => entry.element.data.locked !== true && !entry.ancestors.some((ancestor) => entries.get(ancestor)?.element.data.locked === true));
    if (selected.length < 2) throw new Error("Select at least two unlocked nodes");
    const parentOffset = (id: string | null): { x: number; y: number } => {
        if (!id) return { x: 0, y: 0 };
        const node = findNode(document.nodes, id);
        if (!node) throw new Error(`Unknown parent: ${id}`);
        const offset = parentOffset(entries.get(id)?.parentId ?? null);
        return { x: offset.x + Number(node.data.x ?? 0), y: offset.y + Number(node.data.y ?? 0) };
    };
    const boxes = selected.map((entry) => {
        const parent = parentOffset(entry.parentId);
        return {
            node: entry.element,
            x: parent.x + Number(entry.element.data.x ?? 0),
            y: parent.y + Number(entry.element.data.y ?? 0),
            width: Number(entry.element.data.width ?? 0),
            height: Number(entry.element.data.height ?? 0),
        };
    });
    const minX = Math.min(...boxes.map((box) => box.x));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const positions = new Map<string, { x: number; y: number }>();
    const place = (box: typeof boxes[number], x: number, y: number) => {
        const parent = parentOffset(entries.get(box.node.id)!.parentId);
        positions.set(box.node.id, { x: x - parent.x, y: y - parent.y });
    };
    if (action === "distributeHorizontal" || action === "distributeVertical") {
        const horizontal = action === "distributeHorizontal";
        const axis = horizontal ? "x" : "y";
        const size = horizontal ? "width" : "height";
        const sorted = [...boxes].sort((a, b) => a[axis] - b[axis]);
        const first = sorted[0]!;
        const last = sorted.at(-1)!;
        const start = first[axis];
        const end = last[axis] + last[size];
        const gap = (end - start - sorted.reduce((total, box) => total + box[size], 0)) / (sorted.length - 1);
        let cursor = start;
        sorted.forEach((box, index) => {
            place(box, horizontal ? (index === 0 || index === sorted.length - 1 ? box.x : cursor) : box.x,
                horizontal ? box.y : (index === 0 || index === sorted.length - 1 ? box.y : cursor));
            cursor += box[size] + gap;
        });
    } else {
        for (const box of boxes) {
            const x = action === "alignLeft" ? minX
                : action === "alignCenter" ? centerX - box.width / 2
                    : action === "alignRight" ? maxX - box.width : box.x;
            const y = action === "alignTop" ? minY
                : action === "alignMiddle" ? centerY - box.height / 2
                    : action === "alignBottom" ? maxY - box.height : box.y;
            place(box, x, y);
        }
    }
    let count = 0;
    for (const box of boxes) {
        const next = positions.get(box.node.id)!;
        if (Math.abs(Number(box.node.data.x ?? 0) - next.x) <= 1 && Math.abs(Number(box.node.data.y ?? 0) - next.y) <= 1) continue;
        box.node.data.x = next.x;
        box.node.data.y = next.y;
        count++;
    }
    return count;
}
