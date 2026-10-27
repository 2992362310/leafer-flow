import type { DocumentStore } from "./document-store";
import type { DocumentAsset, DocumentNode, EditorDocument, JsonValue } from "./model";

export interface ResourceLimits {
    maxAssetBytes: number;
    maxDocumentBytes: number;
}

const DEFAULT_LIMITS: ResourceLimits = {
    maxAssetBytes: 20 * 1024 * 1024,
    maxDocumentBytes: 100 * 1024 * 1024,
};

export function decodeResource(source: string, materialize = true): { mimeType: string; bytes: Uint8Array; byteLength: number } {
    if (typeof source !== "string") throw new Error("Resource source must be a data URL");
    const url = new URL(source);
    if (url.protocol !== "data:") throw new Error("Document resources must be embedded data URLs");
    const separator = source.indexOf(",");
    const header = source.slice(5, separator);
    const match = /^([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)(?:;charset=[a-z0-9._-]+)?(;base64)?$/i.exec(header);
    if (separator < 0 || !match) throw new Error("Invalid resource data URL");
    const payload = source.slice(separator + 1);
    let bytes: Uint8Array;
    let byteLength: number;
    if (match[2]) {
        const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
        if (payload.length % 4 !== 0 || /[^A-Za-z0-9+/]/.test(payload.slice(0, payload.length - padding))) {
            throw new Error("Invalid base64 resource");
        }
        byteLength = payload.length / 4 * 3 - padding;
        const binary = materialize ? atob(payload) : "";
        bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } else {
        bytes = new TextEncoder().encode(decodeURIComponent(payload));
        byteLength = bytes.byteLength;
    }
    return { mimeType: match[1]!.toLowerCase(), bytes, byteLength };
}

function encodeResource(mimeType: string, bytes: Uint8Array): string {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
}

export function validateResource(asset: DocumentAsset): number {
    if (!asset.id?.trim() || !asset.mimeType?.trim()) throw new Error("Resource id and MIME type are required");
    if (["__proto__", "prototype", "constructor"].includes(asset.id)) throw new Error("Reserved resource id");
    const decoded = decodeResource(asset.source, false);
    if (decoded.mimeType !== asset.mimeType.toLowerCase()) throw new Error("Resource MIME type does not match its source");
    return decoded.byteLength;
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
    private disposed = false;

    constructor(private document: DocumentStore, limits: Partial<ResourceLimits> = {}) {
        this.limits = { ...DEFAULT_LIMITS, ...limits };
        if (Object.values(this.limits).some((value) => !Number.isFinite(value) || value <= 0)) {
            throw new Error("Resource limits must be positive finite numbers");
        }
    }

    async prepare(file: Blob): Promise<DocumentAsset> {
        this.assertActive();
        if (file.size > this.limits.maxAssetBytes) throw new Error("Resource exceeds the per-file size limit");
        if (!file.type || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(file.type)) {
            throw new Error("Resource MIME type is required");
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const prefix = new TextEncoder().encode(`${file.type.toLowerCase()}\0`);
        const content = new Uint8Array(prefix.length + bytes.length);
        content.set(prefix);
        content.set(bytes, prefix.length);
        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", content));
        this.assertActive();
        const id = `asset-${Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
        return { id, mimeType: file.type.toLowerCase(), source: encodeResource(file.type.toLowerCase(), bytes) };
    }

    attach(draft: EditorDocument, assets: DocumentAsset[]): Map<string, string> {
        this.assertActive();
        const aliases = new Map<string, string>();
        for (const asset of assets) {
            const size = validateResource(asset);
            if (size > this.limits.maxAssetBytes) throw new Error("Resource exceeds the per-file size limit");
            const existing = Object.hasOwn(draft.assets, asset.id) ? draft.assets[asset.id] : undefined;
            if (existing && (existing.source !== asset.source || existing.mimeType !== asset.mimeType)) {
                throw new Error(`Resource id collision: ${asset.id}`);
            }
            const duplicate = Object.values(draft.assets).find((item) => item.source === asset.source && item.mimeType === asset.mimeType);
            aliases.set(asset.id, duplicate?.id ?? asset.id);
            if (!duplicate) draft.assets[asset.id] = structuredClone(asset);
        }
        this.validate(draft);
        return aliases;
    }

    capture(draft: EditorDocument, source: string): string {
        this.assertActive();
        const existing = Object.values(draft.assets).find((asset) => asset.source === source);
        if (existing) return existing.id;
        const decoded = decodeResource(source);
        const canonical = encodeResource(decoded.mimeType, decoded.bytes);
        const asset = { id: crypto.randomUUID(), mimeType: decoded.mimeType, source: canonical };
        return this.attach(draft, [asset]).get(asset.id)!;
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
            if (size > this.limits.maxAssetBytes) throw new Error("Resource exceeds the per-file size limit");
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
            this.resolve(id);
            const asset = Object.hasOwn(snapshot.assets, id) ? snapshot.assets[id]! : this.retained.get(id)!.asset;
            const previous = this.retained.get(id);
            if (previous && (previous.asset.source !== asset.source || previous.asset.mimeType !== asset.mimeType)) {
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
                else this.retained.delete(id);
            }
        };
    }

    pruneUnused(): number {
        this.assertActive();
        let count = 0;
        this.document.transact("Remove unused resources", (draft) => {
            const references = collectResourceReferences(draft);
            for (const id of Object.keys(draft.assets)) {
                if (references.has(id) || this.retained.has(id)) continue;
                delete draft.assets[id];
                count++;
            }
        });
        return count;
    }

    dispose() {
        this.disposed = true;
        this.retained.clear();
    }

    private assertActive() {
        if (this.disposed) throw new Error("Resource service is disposed");
    }
}
