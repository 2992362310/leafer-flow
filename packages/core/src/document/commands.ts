import type { DocumentStore } from "./document-store";
import type { DocumentAsset, DocumentEdge, DocumentNode, JsonObject } from "./model";
import type { NodeTypeRegistry } from "../core/node-type-registry";
import type { ResourceService } from "./resources";
import type { DocumentClipboard } from "./clipboard";
import type { FlowGraph, FlowGraphNodeStyle } from "../core/flow-graph";
import { edgeToConnectorState } from "../core/flow-graph";
import type { FlowNodeKind } from "../core/flow-node-shape";
import { FLOW_NODE_DOCUMENT_TYPE } from "../core/builtin-node-types";

export interface PresentationPatch {
  x?: number; y?: number; width?: number; height?: number; rotation?: number; scale_x?: number; scale_y?: number;
  fill?: string; stroke?: string; stroke_width?: number; opacity?: number; corner_radius?: number;
  dash_pattern?: number[];
  text?: string; font_size?: number; text_color?: string;
  font_weight?: string; font_style?: string; text_align?: string;
  route_type?: string;
  start_arrow?: string | null;
  end_arrow?: string | null;
  route_corner_radius?: number;
  from_side?: string;
  to_side?: string;
  connector_description?: string;
}

const STYLE_PATCH_KEYS = ["fill", "stroke", "stroke_width", "opacity", "corner_radius", "dash_pattern"] as const;

function applyStyle(data: JsonObject, patch: PresentationPatch) {
  const keys: Record<(typeof STYLE_PATCH_KEYS)[number], string> = {
    fill: "fill", stroke: "stroke", stroke_width: "strokeWidth", opacity: "opacity", corner_radius: "cornerRadius", dash_pattern: "dashPattern",
  };
  for (const key of STYLE_PATCH_KEYS) {
    const value = patch[key];
    if (value !== undefined) data[keys[key]] = value;
  }
}

function applyShapeStyle(node: DocumentNode, patch: PresentationPatch): boolean {
  if (node.type === "Text") return false;
  if (node.type === "Group" || node.type === "Box" || node.type === "Frame") {
    let changed = false;
    for (const child of node.children) changed = applyShapeStyle(child, patch) || changed;
    return changed;
  }
  applyStyle(node.data, patch);
  return STYLE_PATCH_KEYS.some((key) => patch[key] !== undefined);
}

function applyTextPatch(nodes: DocumentNode[], patch: PresentationPatch): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === FLOW_NODE_DOCUMENT_TYPE) {
      if (patch.text !== undefined) node.data.text = patch.text;
      if (patch.font_size !== undefined) node.data.fontSize = patch.font_size;
      if (patch.text_color !== undefined) node.data.textColor = patch.text_color;
      if (patch.font_weight !== undefined) node.data.fontWeight = patch.font_weight;
      if (patch.font_style !== undefined) node.data.fontStyle = patch.font_style;
      if (patch.text_align !== undefined) node.data.textAlign = patch.text_align;
      if ([patch.text, patch.font_size, patch.text_color, patch.font_weight, patch.font_style, patch.text_align].some((value) => value !== undefined)) count++;
      continue;
    }
    if (node.type === "Text") {
      if (patch.text !== undefined) node.data.text = patch.text;
      if (patch.font_size !== undefined) node.data.fontSize = patch.font_size;
      if (patch.text_color !== undefined) node.data.fill = patch.text_color;
      if (patch.font_weight !== undefined) node.data.fontWeight = patch.font_weight;
      if (patch.font_style !== undefined) node.data.fontStyle = patch.font_style;
      if (patch.text_align !== undefined) node.data.textAlign = patch.text_align;
      if ([patch.text, patch.font_size, patch.text_color, patch.font_weight, patch.font_style, patch.text_align].some((value) => value !== undefined)) count++;
      continue;
    }
    count += applyTextPatch(node.children, patch);
  }
  return count;
}
import {
  moveDocumentElements, reorderDocumentElements, setDocumentElementState, unlockDocumentElements, placeDocumentElement,
  groupDocumentNodes, ungroupDocumentNodes, alignDocumentElements,
  type ElementStatePatch, type LayerOrderAction, type ElementPlacement, type AlignAction,
} from "./element-operations";

export class DocumentCommands {
  constructor(private document: DocumentStore, private nodeTypes: NodeTypeRegistry, private resources: ResourceService, private clipboard: DocumentClipboard) { }

  updateSettings(patch: JsonObject) {
    return this.document.transact("Update document settings", (draft) => {
      Object.assign(draft.settings, structuredClone(patch));
    });
  }

  createNode(type: string, data: JsonObject = {}, parentId?: string) {
    const definition = this.nodeTypes.get(type);
    if (!definition) throw new Error(`Unknown node type: ${type}`);
    const node: DocumentNode = {
      id: crypto.randomUUID(),
      type,
      version: definition.version,
      data: { ...structuredClone(definition.defaults ?? {}), ...structuredClone(data) },
      children: [],
    };
    return this.insertNode(node, parentId);
  }

  insertNode(node: DocumentNode, parentId?: string, assets: DocumentAsset[] = []) {
    this.assertContainer(parentId);
    const validate = (item: DocumentNode) => {
      this.nodeTypes.get(item.type, item.version)?.validate?.(structuredClone(item.data));
      item.children.forEach(validate);
    };
    validate(node);
    this.document.transact("Insert node", (draft) => {
      const parent = parentId ? this.find(draft.nodes, parentId) : undefined;
      if (parentId && !parent) throw new Error(`Unknown parent: ${parentId}`);
      const aliases = this.resources.attach(draft, assets);
      const inserted = structuredClone(node);
      this.resources.remapNode(inserted, aliases);
      (parent?.children ?? draft.nodes).push(inserted);
    });
    return node.id;
  }

  updateNode(id: string, patch: JsonObject) {
    return this.document.transact("Update node", (draft) => {
      const node = this.find(draft.nodes, id);
      if (!node) throw new Error(`Unknown node: ${id}`);
      Object.assign(node.data, structuredClone(patch));
      this.nodeTypes.get(node.type, node.version)?.validate?.(structuredClone(node.data));
    });
  }

  setCustomData(id: string, value?: JsonObject) {
    return this.document.transact("Update custom node data", (draft) => {
      const node = this.find(draft.nodes, id);
      if (!node) throw new Error(`Unknown node: ${id}`);
      if (value === undefined) delete node.data.customData;
      else node.data.customData = structuredClone(value);
    });
  }

  updateNodes(patches: Record<string, JsonObject>) {
    const entries = Object.entries(patches);
    if (!entries.length) return 0;
    this.document.transact("Update document nodes", (draft) => {
      for (const [id, patch] of entries) {
        const node = this.find(draft.nodes, id);
        if (!node) throw new Error(`Unknown node: ${id}`);
        Object.assign(node.data, structuredClone(patch));
        this.nodeTypes.get(node.type, node.version)?.validate?.(structuredClone(node.data));
      }
    });
    return entries.length;
  }

  updatePresentation(ids: string[], patch: PresentationPatch) {
    return this.updatePresentations(Object.fromEntries(ids.map((id) => [id, patch])));
  }

  updatePresentations(patches: Record<string, PresentationPatch>) {
    const values = Object.values(patches).flatMap((patch) => Object.values(patch)
      .flatMap((value) => Array.isArray(value) ? value : [value]));
    if (values.some((value) => typeof value === "number" && !Number.isFinite(value))) {
      throw new Error("Presentation values must be finite");
    }
    let count = 0;
    this.document.transact("Update presentation", (draft) => {
      for (const [id, patch] of Object.entries(patches)) {
        const node = this.find(draft.nodes, id);
        if (node) {
          let changed = false;
          for (const [key, patchKey] of [["x", "x"], ["y", "y"], ["width", "width"], ["height", "height"], ["rotation", "rotation"], ["scaleX", "scale_x"], ["scaleY", "scale_y"]] as const) {
            if (patch[patchKey] === undefined) continue;
            const value = key === "width" || key === "height" ? Math.max(1, patch[patchKey]!) : patch[patchKey]!;
            if (node.data[key] !== value) { node.data[key] = value; changed = true; }
          }
          if (node.type === FLOW_NODE_DOCUMENT_TYPE) {
            if (STYLE_PATCH_KEYS.some((key) => patch[key] !== undefined)) {
              const style = node.data.style && typeof node.data.style === "object" && !Array.isArray(node.data.style)
                ? node.data.style as JsonObject : {};
              applyStyle(style, patch);
              node.data.style = style;
              changed = true;
            }
            if (patch.text !== undefined) { node.data.text = patch.text; changed = true; }
            if (patch.font_size !== undefined) { node.data.fontSize = patch.font_size; changed = true; }
            if (patch.text_color !== undefined) { node.data.textColor = patch.text_color; changed = true; }
            if (patch.font_weight !== undefined) { node.data.fontWeight = patch.font_weight; changed = true; }
            if (patch.font_style !== undefined) { node.data.fontStyle = patch.font_style; changed = true; }
            if (patch.text_align !== undefined) { node.data.textAlign = patch.text_align; changed = true; }
          } else {
            if (applyShapeStyle(node, patch)) changed = true;
            if (node.type === "Text") {
              if (patch.text !== undefined) { node.data.text = patch.text; changed = true; }
              if (patch.font_size !== undefined) { node.data.fontSize = patch.font_size; changed = true; }
              if (patch.text_color !== undefined) { node.data.fill = patch.text_color; changed = true; }
              if (patch.font_weight !== undefined) { node.data.fontWeight = patch.font_weight; changed = true; }
              if (patch.font_style !== undefined) { node.data.fontStyle = patch.font_style; changed = true; }
              if (patch.text_align !== undefined) { node.data.textAlign = patch.text_align; changed = true; }
            } else if ([patch.text, patch.font_size, patch.text_color, patch.font_weight, patch.font_style, patch.text_align].some((value) => value !== undefined)) {
              count += applyTextPatch(node.children, patch);
            }
          }
          if (changed) count++;
          this.nodeTypes.get(node.type, node.version)?.validate?.(structuredClone(node.data));
          continue;
        }
        const edge = draft.edges.find((item) => item.id === id);
        if (!edge) throw new Error(`Unknown document element: ${id}`);
        applyStyle(edge.data, patch);
        if (patch.route_type !== undefined) edge.data.routeType = patch.route_type;
        if (patch.start_arrow !== undefined) {
          if (patch.start_arrow === null) delete edge.data.startArrow;
          else edge.data.startArrow = patch.start_arrow;
        }
        if (patch.end_arrow !== undefined) {
          if (patch.end_arrow === null) delete edge.data.endArrow;
          else edge.data.endArrow = patch.end_arrow;
        }
        if (patch.route_corner_radius !== undefined) edge.data.cornerRadius = patch.route_corner_radius;
        if (patch.connector_description !== undefined) edge.data.customData = patch.connector_description;
        for (const [endpoint, side] of [[edge.from, patch.from_side], [edge.to, patch.to_side]] as const) {
          if (side === undefined || !("nodeId" in endpoint)) continue;
          endpoint.port.side = side;
        }
        if (patch.x !== undefined || patch.y !== undefined) {
          const dx = patch.x === undefined ? 0 : patch.x - Number(edge.data.x ?? 0);
          const dy = patch.y === undefined ? 0 : patch.y - Number(edge.data.y ?? 0);
          for (const endpoint of [edge.from, edge.to]) if (!("nodeId" in endpoint)) { endpoint.x += dx; endpoint.y += dy; }
          if (Array.isArray(edge.data.waypoints)) for (const point of edge.data.waypoints) {
            if (point && typeof point === "object" && !Array.isArray(point)) {
              if (typeof point.x === "number") point.x += dx;
              if (typeof point.y === "number") point.y += dy;
            }
          }
          if (patch.x !== undefined) edge.data.x = patch.x;
          if (patch.y !== undefined) edge.data.y = patch.y;
        }
        count++;
      }
    });
    return count;
  }

  insertEdge(edge: DocumentEdge) {
    this.assertContainer(edge.parentId);
    this.document.transact("Insert edge", (draft) => { draft.edges.push(structuredClone(edge)); });
    return edge.id;
  }

  addConnectorLabel(edgeId: string) {
    let labelId = "";
    this.document.transact("Add connector label", (draft) => {
      const edge = draft.edges.find((item) => item.id === edgeId);
      if (!edge) throw new Error(`Unknown connector: ${edgeId}`);
      const existing = findLabeledNode(draft.nodes, edgeId);
      if (existing) { labelId = existing.id; return; }
      const from = this.endpointPosition(draft.nodes, edge.from);
      const to = this.endpointPosition(draft.nodes, edge.to);
      labelId = crypto.randomUUID();
      draft.nodes.push({
        id: labelId,
        type: "Text",
        version: 1,
        data: {
          x: (from.x + to.x) / 2 - 18,
          y: (from.y + to.y) / 2 - 10,
          width: 36,
          height: 20,
          text: "标签",
          editable: true,
          fill: "#1f2937",
          fontSize: 12,
          textAlign: "center",
          verticalAlign: "middle",
          name: "连接线标签",
        },
        children: [],
        label: { edgeId, offsetX: 0, offsetY: 0 },
      });
    });
    return labelId;
  }

  addConnectorWaypoint(edgeId: string, point: { x: number; y: number }) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Waypoint must use finite coordinates");
    this.document.transact("Add connector waypoint", (draft) => {
      const edge = draft.edges.find((item) => item.id === edgeId);
      if (!edge) throw new Error(`Unknown connector: ${edgeId}`);
      const waypoints = Array.isArray(edge.data.waypoints) ? edge.data.waypoints as JsonObject[] : [];
      edge.data.waypoints = [...waypoints, { x: point.x, y: point.y }];
    });
  }

  removeConnectorWaypoints(edgeId: string) {
    let count = 0;
    this.document.transact("Remove connector waypoints", (draft) => {
      const edge = draft.edges.find((item) => item.id === edgeId);
      if (!edge) throw new Error(`Unknown connector: ${edgeId}`);
      count = Array.isArray(edge.data.waypoints) ? edge.data.waypoints.length : 0;
      if (count) delete edge.data.waypoints;
    });
    return count;
  }

  insertFlowGraph(graph: FlowGraph, styleOf: (kind: FlowNodeKind) => FlowGraphNodeStyle, settings?: JsonObject) {
    const ids = new Map<string, string>();
    const nodes: DocumentNode[] = graph.nodes.map((item) => {
      if (ids.has(item.id)) throw new Error(`Duplicate template node id: ${item.id}`);
      const id = crypto.randomUUID();
      ids.set(item.id, id);
      return {
        id,
        type: FLOW_NODE_DOCUMENT_TYPE,
        version: 1,
        data: {
          kind: item.kind,
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          style: structuredClone(item.style ?? styleOf(item.kind)),
        } as JsonObject,
        children: [],
      } satisfies DocumentNode;
    });
    const nodeBySourceId = new Map(graph.nodes.map((node) => [node.id, node]));
    const edges: DocumentEdge[] = graph.edges.flatMap((edge) => {
      const from = nodeBySourceId.get(edge.from);
      const to = nodeBySourceId.get(edge.to);
      const fromId = ids.get(edge.from);
      const toId = ids.get(edge.to);
      if (!from || !to || !fromId || !toId) throw new Error(`Template edge has an unknown endpoint: ${edge.id}`);
      const state = edgeToConnectorState(edge, from, to);
      const { mode: _mode, fromId: _fromId, toId: _toId, fromPoint: _fromPoint, toPoint: _toPoint, opt1, opt2, ...data } = state;
      const id = crypto.randomUUID();
      if (edge.label) {
        const centerX = (from.x + from.width / 2 + to.x + to.width / 2) / 2;
        const centerY = (from.y + from.height / 2 + to.y + to.height / 2) / 2;
        nodes.push({
          id: crypto.randomUUID(),
          type: "Text",
          version: 1,
          data: { x: centerX - 18, y: centerY - 10, width: 36, height: 20, text: edge.label, editable: true, fill: "#1f2937", fontSize: 12, textAlign: "center", verticalAlign: "middle", name: "连接线标签" },
          children: [],
          label: { edgeId: id, offsetX: 0, offsetY: 0 },
        });
      }
      return [{
        id,
        parentId: null,
        from: { nodeId: fromId, port: structuredClone((opt1 ?? {}) as JsonObject) },
        to: { nodeId: toId, port: structuredClone((opt2 ?? {}) as JsonObject) },
        data: structuredClone(data as JsonObject),
      }];
    });
    const labels = nodes.filter((node) => node.label).length;
    const nodeIds = nodes.filter((node) => node.type === FLOW_NODE_DOCUMENT_TYPE).map((node) => node.id);
    this.document.transact("Insert template graph", (draft) => {
      for (const node of nodes) this.nodeTypes.get(node.type, node.version)?.validate?.(structuredClone(node.data));
      draft.nodes.push(...structuredClone(nodes));
      draft.edges.push(...structuredClone(edges));
      if (settings) Object.assign(draft.settings, structuredClone(settings));
    });
    return { nodeIds, edgeCount: edges.length, labelCount: labels };
  }

  moveElements(ids: string[], dx: number, dy: number) {
    let count = 0;
    this.document.transact("Move elements", (draft) => { count = moveDocumentElements(draft, ids, dx, dy); });
    return count;
  }

  setElementState(ids: string[], patch: ElementStatePatch) {
    let count = 0;
    this.document.transact("Set element state", (draft) => { count = setDocumentElementState(draft, ids, patch); });
    return count;
  }

  reorderElements(ids: string[], action: LayerOrderAction) {
    let count = 0;
    this.document.transact("Reorder elements", (draft) => { count = reorderDocumentElements(draft, ids, action); });
    return count;
  }

  alignElements(ids: string[], action: AlignAction) {
    let count = 0;
    this.document.transact("Align elements", (draft) => { count = alignDocumentElements(draft, ids, action); });
    return count;
  }

  unlockAll() {
    let count = 0;
    this.document.transact("Unlock elements", (draft) => { count = unlockDocumentElements(draft); });
    return count;
  }

  placeElement(id: string, targetId: string, placement: ElementPlacement) {
    if (placement === "inside") this.assertContainer(targetId);
    let changed = false;
    this.document.transact("Place element", (draft) => { changed = placeDocumentElement(draft, id, targetId, placement); });
    return changed;
  }

  groupElements(ids: string[]) {
    let result = { id: "", count: 0 };
    this.document.transact("Group elements", (draft) => { result = groupDocumentNodes(draft, ids); });
    return result;
  }

  ungroupElements(ids: string[]) {
    let result: { ids: string[]; count: number } = { ids: [], count: 0 };
    this.document.transact("Ungroup elements", (draft) => { result = ungroupDocumentNodes(draft, ids); });
    return result;
  }

  copyElements(ids: string[]) { return this.clipboard.copy(ids); }
  cutElements(ids: string[]) { return this.clipboard.cut(ids); }
  pasteElements(offset?: number) { return this.clipboard.paste(offset); }
  duplicateElements(ids: string[], offset?: number) { return this.clipboard.duplicate(ids, offset); }

  remove(ids: string[]) {
    const removed = new Set(ids);
    let count = 0;
    this.document.transact("Delete elements", (draft) => {
      const descendants = (nodes: DocumentNode[], parentRemoved = false) => {
        for (const node of nodes) {
          const removing = parentRemoved || removed.has(node.id);
          if (removing) removed.add(node.id);
          descendants(node.children, removing);
        }
      };
      descendants(draft.nodes);
      draft.edges = draft.edges.filter((edge) => {
        const removing = removed.has(edge.id) || (edge.parentId !== null && removed.has(edge.parentId))
          || ("nodeId" in edge.from && removed.has(edge.from.nodeId))
          || ("nodeId" in edge.to && removed.has(edge.to.nodeId));
        if (removing) { removed.add(edge.id); count++; }
        return !removing;
      });
      const prune = (nodes: DocumentNode[]): DocumentNode[] => nodes.filter((node) => {
        const removing = removed.has(node.id) || (node.label && removed.has(node.label.edgeId));
        if (removing) { count++; return false; }
        node.children = prune(node.children);
        return true;
      });
      draft.nodes = prune(draft.nodes);
    });
    return count;
  }

  clear() {
    return this.document.transact("Clear document", (draft) => {
      draft.nodes = [];
      draft.edges = [];
    });
  }

  private find(nodes: DocumentNode[], id: string): DocumentNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = this.find(node.children, id);
      if (found) return found;
    }
  }

  private assertContainer(id?: string | null) {
    if (!id) return;
    const node = this.document.getNode(id);
    if (!node || !this.nodeTypes.get(node.type, node.version)?.acceptsChildren) {
      throw new Error("Target node does not accept children");
    }
  }

  private endpointPosition(nodes: DocumentNode[], endpoint: DocumentEdge["from"]): { x: number; y: number } {
    if (!("nodeId" in endpoint)) return { x: endpoint.x, y: endpoint.y };
    const find = (items: DocumentNode[], offsetX: number, offsetY: number): { node?: DocumentNode; x: number; y: number } | undefined => {
      for (const node of items) {
        const x = offsetX + Number(node.data.x ?? 0);
        const y = offsetY + Number(node.data.y ?? 0);
        if (node.id === endpoint.nodeId) return { node, x, y };
        const nested = find(node.children, x, y);
        if (nested) return nested;
      }
    };
    const resolved = find(nodes, 0, 0);
    if (!resolved?.node) throw new Error(`Unknown connector endpoint: ${endpoint.nodeId}`);
    const width = Number(resolved.node.data.width ?? 0);
    const height = Number(resolved.node.data.height ?? 0);
    const port = endpoint.port;
    const side = typeof port.side === "string" ? port.side : "right";
    const percent = typeof port.percent === "number" ? port.percent : 0.5;
    if (side === "left") return { x: resolved.x, y: resolved.y + height * percent };
    if (side === "top") return { x: resolved.x + width * percent, y: resolved.y };
    if (side === "bottom") return { x: resolved.x + width * percent, y: resolved.y + height };
    return { x: resolved.x + width, y: resolved.y + height * percent };
  }
}

function findLabeledNode(nodes: DocumentNode[], edgeId: string): DocumentNode | undefined {
  for (const node of nodes) {
    if (node.label?.edgeId === edgeId) return node;
    const child = findLabeledNode(node.children, edgeId);
    if (child) return child;
  }
}
