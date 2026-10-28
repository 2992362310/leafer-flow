import { collectResourceReferences, validateResource } from "./resources";

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject { [key: string]: JsonValue }

export interface DocumentNode {
  id: string;
  type: string;
  version: number;
  data: JsonObject;
  children: DocumentNode[];
  label?: { edgeId: string; offsetX: number; offsetY: number };
}

export type DocumentEndpoint =
  | { nodeId: string; port: JsonObject }
  | { x: number; y: number };

export interface DocumentEdge {
  id: string;
  parentId: string | null;
  from: DocumentEndpoint;
  to: DocumentEndpoint;
  data: JsonObject;
}

export interface DocumentAsset {
  id: string;
  mimeType: string;
  size: number;
  source: string;
}

export type FlowDocumentSettings = {
  connectorRouteType?: "orthogonal" | "bezier" | "straight";
  connectorFlowAnimation?: {
    enabled?: boolean;
    speed?: number;
    scope?: "all" | "selected";
    direction?: "forward" | "reverse";
  };
};

export interface EditorDocument {
  schema: "leafer-flow.document";
  version: 5;
  id: string;
  nodes: DocumentNode[];
  edges: DocumentEdge[];
  assets: Record<string, DocumentAsset>;
  settings: JsonObject;
}

export function createDocument(): EditorDocument {
  return {
    schema: "leafer-flow.document",
    version: 5,
    id: crypto.randomUUID(),
    nodes: [],
    edges: [],
    assets: {},
    settings: {},
  };
}

export function validateDocument(value: unknown): asserts value is EditorDocument {
  assertObject(value);
  if (value.schema !== "leafer-flow.document" || value.version !== 5) {
    throw new Error("Unsupported document schema or version");
  }
  assertId(value.id);
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error("Document nodes and edges must be arrays");
  }
  assertObject(value.assets);
  assertJson(value.assets);
  assertObject(value.settings);
  assertJson(value.settings);
  const ids = new Set<string>();
  const nodeIds = new Set<string>();
  function register(id: unknown) {
    assertId(id);
    if (ids.has(id)) throw new Error(`Duplicate document id: ${id}`);
    ids.add(id);
  }
  function visit(nodes: unknown[]) {
    for (const node of nodes) {
      assertObject(node);
      register(node.id);
      nodeIds.add(node.id as string);
      assertId(node.type);
      if (!Number.isInteger(node.version) || Number(node.version) < 1) {
        throw new Error("Node version must be a positive integer");
      }
      assertObject(node.data);
      assertJson(node.data);
      if (!Array.isArray(node.children)) throw new Error("Node children must be an array");
      visit(node.children);
    }
  }
  visit(value.nodes);
  function endpoint(input: unknown) {
    assertObject(input);
    if ("nodeId" in input) {
      assertId(input.nodeId);
      if (!nodeIds.has(input.nodeId)) throw new Error(`Missing endpoint node: ${input.nodeId}`);
      assertObject(input.port);
      assertJson(input.port);
    } else if (typeof input.x !== "number" || !Number.isFinite(input.x)
      || typeof input.y !== "number" || !Number.isFinite(input.y)) {
      throw new Error("Point endpoint must have finite coordinates");
    }
  }
  for (const edge of value.edges) {
    assertObject(edge);
    register(edge.id);
    if (edge.parentId !== null && (typeof edge.parentId !== "string" || !nodeIds.has(edge.parentId))) {
      throw new Error("Missing edge parent");
    }
    endpoint(edge.from);
    endpoint(edge.to);
    assertObject(edge.data);
    assertJson(edge.data);
  }
  const edgeIds = new Set((value.edges as DocumentEdge[]).map((edge) => edge.id));
  const assets = value.assets as Record<string, DocumentAsset>;
  function labels(nodes: DocumentNode[]) {
    for (const node of nodes) {
      if (node.label && (!edgeIds.has(node.label.edgeId)
        || !Number.isFinite(node.label.offsetX) || !Number.isFinite(node.label.offsetY))) {
        throw new Error("Invalid connector label");
      }
      labels(node.children);
    }
  }
  labels(value.nodes as DocumentNode[]);
  for (const [id, asset] of Object.entries(value.assets)) {
    assertObject(asset);
    validateResource(asset as unknown as DocumentAsset);
    if (id !== asset.id) throw new Error(`Asset key does not match id: ${id}`);
  }
  for (const id of collectResourceReferences(value as unknown as EditorDocument)) {
    if (!Object.hasOwn(assets, id)) throw new Error(`Missing document asset: ${id}`);
  }
}

function assertId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected a non-empty id");
}

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a plain object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && Object.getPrototypeOf(prototype) !== null) throw new Error("Expected a plain object");
}

function assertJson(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || !value) throw new Error("Document data must be JSON serializable");
  if (ancestors.has(value)) throw new Error("Document data must not contain cycles");
  ancestors.add(value);
  if (!Array.isArray(value)) assertObject(value);
  for (const child of Object.values(value)) assertJson(child, ancestors);
  ancestors.delete(value);
}
