import { Zip, ZipPassThrough, Unzip } from "fflate";
import { validateDocument, type EditorDocument } from "./model";
import type { ResourceService } from "./resources";

const MANIFEST = "document.json";
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 110 * 1024 * 1024;

export async function exportDocumentPackage(
    document: EditorDocument,
    resources: ResourceService,
): Promise<Blob> {
    validateDocument(document);
    resources.validate(document);
    const manifest = new TextEncoder().encode(JSON.stringify(document));
    if (manifest.length > MAX_MANIFEST_BYTES) throw new Error("Document manifest exceeds 4 MiB");
    const chunks: BlobPart[] = [];
    let failure: Error | null = null;
    const zip = new Zip((error, chunk) => {
        if (error) failure = error;
        else chunks.push(chunk.slice().buffer as ArrayBuffer);
    });
    const entry = new ZipPassThrough(MANIFEST);
    zip.add(entry);
    entry.push(manifest, true);
    for (const asset of Object.values(document.assets)) {
        const file = await resources.getBlob(asset.id);
        if (file.size !== asset.size || file.type !== asset.mimeType)
            throw new Error(`Invalid stored resource: ${asset.id}`);
        const input = new ZipPassThrough(`assets/${asset.id}`);
        zip.add(input);
        const reader = file.stream().getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                input.push(value ?? new Uint8Array(), done);
                if (done) break;
            }
        } finally {
            reader.releaseLock();
        }
        if (failure) throw failure;
    }
    zip.end();
    if (failure) throw failure;
    return new Blob(chunks, { type: "application/zip" });
}

export async function importDocumentPackage(
    file: Blob,
    resources: ResourceService,
): Promise<EditorDocument> {
    if (file.size > MAX_PACKAGE_BYTES) throw new Error("Document package exceeds the size limit");
    let document: EditorDocument | undefined;
    const seen = new Set<string>();
    const manifestChunks: Uint8Array[] = [];
    let manifestSize = 0;
    let failure: unknown;
    const drains: Promise<unknown>[] = [];
    const imports: Promise<unknown>[] = [];
    const writers: WritableStreamDefaultWriter<Uint8Array>[] = [];
    const unzip = new Unzip((entry) => {
        if (seen.has(entry.name) || entry.compression !== 0)
            throw new Error("Duplicate or unsupported package entry");
        seen.add(entry.name);
        if (entry.name === MANIFEST) {
            if (seen.size !== 1) throw new Error("Document manifest must be the first entry");
            entry.ondata = (error, data, final) => {
                if (error) throw error;
                manifestSize += data.length;
                if (manifestSize > MAX_MANIFEST_BYTES) throw new Error("Document manifest exceeds 4 MiB");
                manifestChunks.push(data.slice());
                if (final) {
                    const bytes = new Uint8Array(manifestSize);
                    let offset = 0;
                    for (const chunk of manifestChunks) {
                        bytes.set(chunk, offset);
                        offset += chunk.length;
                    }
                    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
                    validateDocument(value);
                    resources.validate(value);
                    document = value;
                }
            };
        } else {
            const id = entry.name.startsWith("assets/") ? entry.name.slice(7) : "";
            const asset = document?.assets[id];
            if (!asset || entry.name !== `assets/${asset.id}`)
                throw new Error(`Unexpected package entry: ${entry.name}`);
            const pipe = new TransformStream<Uint8Array, Uint8Array>();
            const writer = pipe.writable.getWriter();
            writers.push(writer);
            const task = resources.importStream(asset, pipe.readable);
            void task.catch((error) => {
                failure = error;
            });
            imports.push(task);
            entry.ondata = (error, data, final) => {
                if (error) throw error;
                if (data.length) drains.push(writer.write(data.slice()));
                if (final) drains.push(writer.close());
            };
        }
        entry.start();
    });
    const reader = file.stream().getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            unzip.push(value ?? new Uint8Array(), done);
            await Promise.all(drains.splice(0));
            if (failure) throw failure;
            if (done) break;
        }
        await Promise.all(imports);
        if (!document || Object.keys(document.assets).some((id) => !seen.has(`assets/${id}`)))
            throw new Error("Document package is incomplete");
        return document;
    } catch (error) {
        await Promise.allSettled(writers.map((writer) => writer.abort(error)));
        await Promise.allSettled(imports);
        throw error;
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
