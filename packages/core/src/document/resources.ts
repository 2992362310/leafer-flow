import type { DocumentStore } from "./document-store";
import type { DocumentAsset, DocumentNode, EditorDocument, JsonValue } from "./model";
import { BinaryAssetStore } from "./binary-asset-store";
import { sha256 } from "@noble/hashes/sha2.js";

export interface ResourceLimits {
  maxAssetBytes: number;
  maxVideoBytes: number;
  maxDocumentBytes: number;
}

export const VIDEO_ASSET_MAX_BYTES = 80 * 1024 * 1024;

const DEFAULT_LIMITS: ResourceLimits = {
  maxAssetBytes: 20 * 1024 * 1024,
  maxVideoBytes: VIDEO_ASSET_MAX_BYTES,
  maxDocumentBytes: 100 * 1024 * 1024,
};

function maxBytesForMimeType(mimeType: string, limits: ResourceLimits) {
  return mimeType.toLowerCase().startsWith("video/") ? limits.maxVideoBytes : limits.maxAssetBytes;
}

function assertWithinAssetLimit(mimeType: string, size: number, limits: ResourceLimits) {
  const maxBytes = maxBytesForMimeType(mimeType, limits);
  if (size > maxBytes) {
    const label = mimeType.toLowerCase().startsWith("video/") ? "Video resource" : "Resource";
    throw new Error(`${label} exceeds the per-file size limit`);
  }
}

export function validateResource(asset: DocumentAsset): number {
  if (!asset.id?.trim() || !asset.mimeType?.trim()) throw new Error("Resource id and MIME type are required");
  if (["__proto__", "prototype", "constructor"].includes(asset.id)) throw new Error("Reserved resource id");
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(asset.mimeType)) throw new Error("Invalid resource MIME type");
  const prefix = `data:${asset.mimeType};base64,`;
  if (typeof asset.source !== "string" || !asset.source.toLowerCase().startsWith(prefix.toLowerCase())) {
    throw new Error("Resource must include embedded data URLs");
  }
  const encoded = asset.source.slice(prefix.length);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("Invalid embedded resource data");
  }
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0) throw new Error("Invalid resource size");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  if (encoded.length !== Math.ceil(asset.size / 3) * 4 || padding !== (3 - asset.size % 3) % 3) {
    throw new Error("Embedded resource size mismatch");
  }
  return asset.size;
}

export function collectResourceReferences(document: EditorDocument): Set<string> {
  const references = new Set<string>();
  const visit = (value: JsonValue) => {
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value)) {
      if (value.assetId !== undefined) {
        if (typeof value.assetId !== "string" || !value.assetId.trim()) throw new Error("Invalid resource reference");
        references.add(value.assetId);
      }
      if (value.assetIds !== undefined) {
        if (!Array.isArray(value.assetIds)) throw new Error("Resource references must be an array");
        for (const id of value.assetIds) {
          if (typeof id !== "string" || !id.trim()) throw new Error("Invalid resource reference");
          references.add(id);
        }
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  const nodes = (items: EditorDocument["nodes"]) => {
    for (const node of items) { visit(node.data); nodes(node.children); }
  };
  nodes(document.nodes);
  for (const edge of document.edges) visit(edge.data);
  visit(document.settings);
  return references;
}

export class ResourceService {
  private limits: ResourceLimits;
  private retained = new Map<string, { count: number; asset: DocumentAsset }>();
  private prepared = new Set<string>();
  private disposed = false;

  constructor(
    private document: DocumentStore,
    limits: Partial<ResourceLimits> = {},
    private storage = new BinaryAssetStore(),
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    if (Object.values(this.limits).some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error("Resource limits must be positive finite numbers");
    }
  }

  validateFile(file: Blob) {
    this.assertActive();
    if (!file.type || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(file.type)) {
      throw new Error("Resource MIME type is required");
    }
    assertWithinAssetLimit(file.type, file.size, this.limits);
  }

  async prepare(file: Blob): Promise<DocumentAsset> {
    this.validateFile(file);
    const mimeType = file.type.toLowerCase();
    const hasher = sha256.create();
    hasher.update(new TextEncoder().encode(`${mimeType}\0`));
    const reader = file.stream().getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        hasher.update(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    this.assertActive();
    const hash = Array.from(hasher.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const id = `asset-${hash}`;
    const existing = await this.storage.get(id);
    const source = await toDataUrl(file);
    const stored = existing ?? file;
    if (!existing) await this.storage.put(id, file);
    if (stored.size !== file.size || stored.type.toLowerCase() !== mimeType) {
      await this.storage.put(id, file);
    }
    this.prepared.add(id);
    return { id, mimeType, size: file.size, source };
  }

  async hydrateAssets(assets: Record<string, DocumentAsset>) {
    this.assertActive();
    const previous = new Map<string, Blob | undefined>();
    try {
      for (const asset of Object.values(assets)) {
        validateResource(asset);
        assertWithinAssetLimit(asset.mimeType, asset.size, this.limits);
        const file = await fromDataUrl(asset);
        if (!previous.has(asset.id)) previous.set(asset.id, await this.storage.get(asset.id));
        await this.storage.put(asset.id, file);
      }
    } catch (error) {
      for (const [id, file] of previous) {
        if (file) await this.storage.put(id, file);
        else await this.storage.delete(id);
      }
      throw error;
    }
    for (const id of previous.keys()) this.prepared.add(id);
  }

  async getBlob(id: string) {
    this.assertActive();
    const file = await this.storage.get(id);
    if (!file) throw new Error(`Missing stored resource: ${id}`);
    return file;
  }

  async importStream(asset: Omit<DocumentAsset, "source">, stream: ReadableStream<Uint8Array>): Promise<DocumentAsset> {
    this.assertActive();
    if (!asset.id?.trim() || ["__proto__", "prototype", "constructor"].includes(asset.id)) throw new Error("Invalid resource id");
    if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(asset.mimeType)) throw new Error("Invalid resource MIME type");
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0) throw new Error("Invalid resource size");
    assertWithinAssetLimit(asset.mimeType, asset.size, this.limits);
    const previous = await this.storage.get(asset.id);
    try {
      await this.storage.putStream(asset.id, asset.mimeType, stream);
      const file = await this.storage.get(asset.id);
      if (!file || file.size !== asset.size || file.type.toLowerCase() !== asset.mimeType.toLowerCase()) {
        throw new Error(`Imported resource metadata mismatch: ${asset.id}`);
      }
      const imported = { ...asset, mimeType: asset.mimeType.toLowerCase(), source: await toDataUrl(file) };
      validateResource(imported);
      this.prepared.add(asset.id);
      return imported;
    } catch (error) {
      if (previous) await this.storage.put(asset.id, previous);
      else await this.storage.delete(asset.id);
      throw error;
    }
  }

  attach(draft: EditorDocument, assets: DocumentAsset[]): Map<string, string> {
    this.assertActive();
    const aliases = new Map<string, string>();
    for (const asset of assets) {
      const size = validateResource(asset);
      assertWithinAssetLimit(asset.mimeType, size, this.limits);
      const existing = Object.hasOwn(draft.assets, asset.id) ? draft.assets[asset.id] : undefined;
      const duplicate = Object.values(draft.assets).find((candidate) =>
        candidate.mimeType.toLowerCase() === asset.mimeType.toLowerCase()
        && candidate.size === asset.size
        && candidate.source === asset.source);
      if (duplicate) {
        aliases.set(asset.id, duplicate.id);
        continue;
      }
      if (existing && (existing.size !== asset.size || existing.mimeType !== asset.mimeType || existing.source !== asset.source)) {
        throw new Error(`Resource id collision: ${asset.id}`);
      }
      aliases.set(asset.id, asset.id);
      if (!existing) draft.assets[asset.id] = structuredClone(asset);
    }
    this.validate(draft);
    return aliases;
  }

  capture(draft: EditorDocument, source: string): string {
    this.assertActive();
    const asset = Object.values(draft.assets).find((candidate) => candidate.source === source);
    if (!asset) throw new Error("Runtime media must be imported through ResourceService.prepare");
    return asset.id;
  }

  remapNode(node: DocumentNode, aliases: Map<string, string>) {
    const visit = (value: JsonValue) => {
      if (!value || typeof value !== "object") return;
      if (!Array.isArray(value)) {
        if (typeof value.assetId === "string") value.assetId = aliases.get(value.assetId) ?? value.assetId;
        if (Array.isArray(value.assetIds)) {
          value.assetIds = value.assetIds.map((id) => typeof id === "string" ? aliases.get(id) ?? id : id);
        }
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(node.data);
    for (const child of node.children) this.remapNode(child, aliases);
  }

  resolve(id: string, document?: EditorDocument): string {
    this.assertActive();
    const snapshot = document ?? this.document.snapshot();
    const asset = Object.hasOwn(snapshot.assets, id) ? snapshot.assets[id] : document ? undefined : this.retained.get(id)?.asset;
    if (!asset) throw new Error(`Missing document resource: ${id}`);
    return asset.source;
  }

  validate(document: EditorDocument) {
    let total = 0;
    for (const asset of Object.values(document.assets)) {
      const size = validateResource(asset);
      assertWithinAssetLimit(asset.mimeType, size, this.limits);
      total += size;
    }
    if (total > this.limits.maxDocumentBytes) throw new Error("Document resource size limit exceeded");
  }

  retain(ids: Iterable<string>): () => void {
    this.assertActive();
    const retained = new Set(ids);
    const snapshot = this.document.snapshot();
    const assets = new Map<string, DocumentAsset>();
    for (const id of retained) {
      const asset = Object.hasOwn(snapshot.assets, id) ? snapshot.assets[id] : this.retained.get(id)?.asset;
      if (!asset) throw new Error(`Missing document resource: ${id}`);
      const previous = this.retained.get(id);
      if (previous && (previous.asset.size !== asset.size || previous.asset.mimeType !== asset.mimeType || previous.asset.source !== asset.source)) {
        throw new Error(`Retained resource id collision: ${id}`);
      }
      assets.set(id, structuredClone(asset));
    }
    for (const [id, asset] of assets) this.retained.set(id, { count: (this.retained.get(id)?.count ?? 0) + 1, asset });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const id of retained) {
        const record = this.retained.get(id);
        const count = (record?.count ?? 0) - 1;
        if (count > 0 && record) this.retained.set(id, { ...record, count });
        else {
          this.retained.delete(id);
          this.removeIfUnused(id);
        }
      }
    };
  }

  pruneUnused(): number {
    this.assertActive();
    let count = 0;
    const removed: string[] = [];
    this.document.transact("Remove unused resources", (draft) => {
      const references = collectResourceReferences(draft);
      for (const id of Object.keys(draft.assets)) {
        if (references.has(id) || this.retained.has(id)) continue;
        delete draft.assets[id];
        removed.push(id);
        count++;
      }
    });
    removed.forEach((id) => this.removeIfUnused(id));
    const assets = this.document.snapshot().assets;
    for (const id of this.prepared) {
      if (Object.hasOwn(assets, id) || this.retained.has(id)) continue;
      this.removeIfUnused(id);
      count++;
    }
    return count;
  }

  dispose() {
    this.disposed = true;
    this.retained.clear();
    for (const id of this.prepared) this.removeIfUnused(id);
  }

  private removeIfUnused(id: string) {
    if (Object.hasOwn(this.document.snapshot().assets, id) || this.retained.has(id)) return;
    this.prepared.delete(id);
    void this.storage.delete(id).catch((error) => console.warn(`Unable to remove asset ${id}:`, error));
  }

  private assertActive() {
    if (this.disposed) throw new Error("Resource service is disposed");
  }
}

async function toDataUrl(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  const chunkSize = 0x6000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))));
  }
  return `data:${file.type.toLowerCase()};base64,${chunks.join("")}`;
}

async function fromDataUrl(asset: DocumentAsset) {
  const prefix = `data:${asset.mimeType};base64,`;
  const encoded = asset.source.slice(prefix.length);
  const chunks: Uint8Array[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < encoded.length; offset += chunkSize) {
    const binary = atob(encoded.slice(offset, offset + chunkSize));
    chunks.push(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  }
  const file = new Blob(chunks.map((chunk) => chunk.buffer as ArrayBuffer), { type: asset.mimeType.toLowerCase() });
  if (file.size !== asset.size) throw new Error(`Embedded resource size mismatch: ${asset.id}`);
  return file;
}
