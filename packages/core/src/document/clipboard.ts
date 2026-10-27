import type { DocumentEdge, DocumentNode, EditorDocument } from "./model";
import { collectResourceReferences, type ResourceService } from "./resources";
import { DocumentStore } from "./document-store";

interface ClipboardPayload {
  nodes: DocumentNode[];
  edges: DocumentEdge[];
  assets: EditorDocument["assets"];
  selectedIds: string[];
  count: number;
}

const PASTE_OFFSET = 20;

export class DocumentClipboard {
  private payload?: ClipboardPayload;
  private releaseResources?: () => void;

  constructor(private document: DocumentStore, private resources: ResourceService) { }

  get isEmpty() { return !this.payload; }
  get itemCount() { return this.payload?.count ?? 0; }

  copy(ids: string[]) {
    this.capture(ids);
    return this.itemCount;
  }

  cut(ids: string[]) {
    this.capture(ids);
    this.document.transact("Cut elements", (draft) => this.removeFromDraft(draft, new Set(ids)));
    return this.itemCount;
  }

  paste(offset = PASTE_OFFSET) {
    if (!this.payload) return [];
    if (!Number.isFinite(offset)) throw new Error("Paste offset must be finite");
    const inserted: string[] = [];
    this.document.transact("Paste elements", (draft) => {
      const aliases = this.resources.attach(draft, Object.values(this.payload!.assets));
      const nodeIds = new Map<string, string>();
      const edgeIds = new Map<string, string>();
      const cloneNode = (node: DocumentNode): DocumentNode => {
        const id = crypto.randomUUID();
        nodeIds.set(node.id, id);
        const copy = structuredClone(node);
        copy.id = id;
        this.resources.remapNode(copy, aliases);
        copy.children = node.children.map(cloneNode);
        return copy;
      };
      const nodes = this.payload!.nodes.map((node) => {
        return cloneNode(node);
      });
      for (const node of nodes) {
        if (typeof node.data.x === "number") node.data.x += offset;
        if (typeof node.data.y === "number") node.data.y += offset;
      }
      for (const edge of this.payload!.edges) edgeIds.set(edge.id, crypto.randomUUID());
      const edges = this.payload!.edges.map((edge) => {
        const copy = structuredClone(edge);
        copy.id = edgeIds.get(edge.id)!;
        copy.parentId = edge.parentId ? nodeIds.get(edge.parentId) ?? null : null;
        for (const endpoint of [copy.from, copy.to]) {
          if ("nodeId" in endpoint) {
            const mapped = nodeIds.get(endpoint.nodeId);
            if (!mapped) throw new Error("Cannot paste an edge with an uncopied node endpoint");
            endpoint.nodeId = mapped;
          } else if (copy.parentId === null) {
            endpoint.x += offset;
            endpoint.y += offset;
          }
        }
        if (Array.isArray(copy.data.waypoints) && copy.parentId === null) {
          for (const point of copy.data.waypoints) {
            if (!point || typeof point !== "object" || Array.isArray(point)) continue;
            if (typeof point.x === "number") point.x += offset;
            if (typeof point.y === "number") point.y += offset;
          }
        }
        return copy;
      });
      const remapLabels = (items: DocumentNode[]) => {
        for (const node of items) {
          if (node.label) node.label.edgeId = edgeIds.get(node.label.edgeId) ?? node.label.edgeId;
          remapLabels(node.children);
        }
      };
      remapLabels(nodes);
      draft.nodes.push(...nodes);
      draft.edges.push(...edges);
      inserted.push(...this.payload!.selectedIds.flatMap((id) => {
        const mapped = nodeIds.get(id) ?? edgeIds.get(id);
        return mapped ? [mapped] : [];
      }));
    });
    return inserted;
  }

  duplicate(ids: string[], offset = PASTE_OFFSET) {
    this.capture(ids);
    return this.paste(offset);
  }

  dispose() {
    this.releaseResources?.();
    this.releaseResources = undefined;
    this.payload = undefined;
  }

  private capture(ids: string[]) {
    const document = this.document.snapshot();
    const selected = new Set(ids);
    const allNodeIds = new Set<string>();
    const collect = (items: DocumentNode[]): DocumentNode[] => items.flatMap((node) => {
      const explicitlySelected = selected.has(node.id);
      const children = explicitlySelected ? structuredClone(node.children) : collect(node.children);
      if (!explicitlySelected && !children.length) return [];
      const copy = structuredClone(node);
      copy.children = children;
      allNodeIds.add(node.id);
      const addDescendantIds = (descendants: DocumentNode[]) => {
        for (const child of descendants) { allNodeIds.add(child.id); addDescendantIds(child.children); }
      };
      addDescendantIds(children);
      return [copy];
    });
    const nodes = collect(document.nodes);
    const directlySelectedEdges = document.edges.filter((edge) => selected.has(edge.id));
    if (!nodes.length && !directlySelectedEdges.length) {
      throw new Error("Select at least one document element");
    }
    const edges = document.edges.filter((edge) => {
      const endpointsIncluded = (!("nodeId" in edge.from) || allNodeIds.has(edge.from.nodeId))
        && (!("nodeId" in edge.to) || allNodeIds.has(edge.to.nodeId));
      if (!endpointsIncluded) return false;
      if (edge.parentId && allNodeIds.has(edge.parentId)) return true;
      if (selected.has(edge.id)) return true;
      return "nodeId" in edge.from && "nodeId" in edge.to
        && allNodeIds.has(edge.from.nodeId) && allNodeIds.has(edge.to.nodeId);
    }).map((edge) => structuredClone(edge));
    if (directlySelectedEdges.some((edge) => !edges.some((copy) => copy.id === edge.id))) {
      throw new Error("Copy the nodes connected to a selected edge");
    }
    const copiedEdgeIds = new Set(edges.map((edge) => edge.id));
    const labels = (items: DocumentNode[]) => {
      for (const node of items) {
        if (node.label && !copiedEdgeIds.has(node.label.edgeId)) delete node.label;
        labels(node.children);
      }
    };
    labels(nodes);
    const references = collectResourceReferences({ ...document, nodes, edges, settings: {} });
    const assets: EditorDocument["assets"] = {};
    for (const id of references) assets[id] = structuredClone(document.assets[id]!);
    const releaseResources = this.resources.retain(Object.keys(assets));
    this.releaseResources?.();
    this.releaseResources = releaseResources;
    const countNodes = (items: DocumentNode[]): number => items.reduce((count, node) => count + 1 + countNodes(node.children), 0);
    this.payload = { nodes, edges, assets, selectedIds: ids, count: countNodes(nodes) + edges.length };
  }

  private removeFromDraft(document: EditorDocument, selected: Set<string>) {
    const descendants = (nodes: DocumentNode[], parentRemoved = false) => {
      for (const node of nodes) {
        const remove = parentRemoved || selected.has(node.id);
        if (remove) selected.add(node.id);
        descendants(node.children, remove);
      }
    };
    descendants(document.nodes);
    document.edges = document.edges.filter((edge) => {
      const remove = selected.has(edge.id) || (edge.parentId !== null && selected.has(edge.parentId))
        || ("nodeId" in edge.from && selected.has(edge.from.nodeId))
        || ("nodeId" in edge.to && selected.has(edge.to.nodeId));
      if (remove) selected.add(edge.id);
      return !remove;
    });
    const prune = (nodes: DocumentNode[]) => nodes.filter((node) => {
      if (selected.has(node.id) || (node.label && selected.has(node.label.edgeId))) return false;
      node.children = prune(node.children);
      return true;
    });
    document.nodes = prune(document.nodes);
  }
}
