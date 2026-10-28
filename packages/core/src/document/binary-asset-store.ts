interface AssetBackend {
    put(id: string, file: Blob): Promise<void>;
    putStream(id: string, type: string, stream: ReadableStream<Uint8Array>): Promise<void>;
    get(id: string): Promise<Blob | undefined>;
    delete(id: string): Promise<void>;
}

interface OpfsFileHandle {
    createWritable(): Promise<{
        write(data: Uint8Array): Promise<void>;
        close(): Promise<void>;
        abort?(): Promise<void>;
    }>;
    getFile(): Promise<File>;
}

interface OpfsDirectoryHandle {
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandle>;
    removeEntry(name: string): Promise<void>;
}

const DATABASE_NAME = "leafer-flow-assets";
const STORE_NAME = "assets";

export class BinaryAssetStore {
    private backend: Promise<AssetBackend>;

    constructor() {
        this.backend = this.openBackend();
    }

    async put(id: string, file: Blob) {
        await (await this.backend).put(id, file);
    }

    async putStream(id: string, type: string, stream: ReadableStream<Uint8Array>) {
        await (await this.backend).putStream(id, type, stream);
    }

    async get(id: string) {
        return (await this.backend).get(id);
    }

    async delete(id: string) {
        await (await this.backend).delete(id);
    }

    private async openBackend(): Promise<AssetBackend> {
        if (typeof navigator === "undefined") return createMemoryBackend();

        const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<OpfsDirectoryHandle> };
        if (storage.getDirectory) {
            try {
                const root = await storage.getDirectory() as unknown as OpfsDirectoryHandle;
                const directory = await root.getDirectoryHandle("leafer-flow-assets", { create: true });
                return createOpfsBackend(directory);
            } catch (error) {
                console.warn("OPFS unavailable, falling back to IndexedDB:", error);
            }
        }

        if (typeof indexedDB !== "undefined") return createIndexedDbBackend();
        return createMemoryBackend();
    }
}

function createMemoryBackend(): AssetBackend {
    const files = new Map<string, Blob>();
    return {
        async put(id, file) { files.set(id, file); },
        async putStream(id, type, stream) { files.set(id, await streamToBlob(stream, type)); },
        async get(id) { return files.get(id); },
        async delete(id) { files.delete(id); },
    };
}

function createOpfsBackend(directory: OpfsDirectoryHandle): AssetBackend {
    return {
        async put(id, file) {
            await writeStream(directory, id, file.stream());
        },
        async putStream(id, _type, stream) { await writeStream(directory, id, stream); },
        async get(id) {
            try {
                return await (await directory.getFileHandle(id)).getFile();
            } catch (error) {
                if (isNotFound(error)) return undefined;
                throw error;
            }
        },
        async delete(id) {
            try {
                await directory.removeEntry(id);
            } catch (error) {
                if (!isNotFound(error)) throw error;
            }
        },
    };
}

async function createIndexedDbBackend(): Promise<AssetBackend> {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Unable to open asset database"));
    });

    const transaction = (mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) =>
        new Promise<unknown>((resolve, reject) => {
            const request = action(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("Asset database request failed"));
        });

    return {
        async put(id, file) { await transaction("readwrite", (store) => store.put(file, id)); },
        async putStream(id, type, stream) {
            const file = await streamToBlob(stream, type);
            await transaction("readwrite", (store) => store.put(file, id));
        },
        async get(id) { return await transaction("readonly", (store) => store.get(id)) as Blob | undefined; },
        async delete(id) { await transaction("readwrite", (store) => store.delete(id)); },
    };
}

async function writeStream(directory: OpfsDirectoryHandle, id: string, stream: ReadableStream<Uint8Array>) {
    const handle = await directory.getFileHandle(id, { create: true });
    const writable = await handle.createWritable();
    const reader = stream.getReader();
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            await writable.write(chunk.value);
        }
        await writable.close();
    } catch (error) {
        await writable.abort?.();
        throw error;
    } finally {
        reader.releaseLock();
    }
}

async function streamToBlob(stream: ReadableStream<Uint8Array>, type: string): Promise<Blob> {
    return new Response(stream, { headers: { "content-type": type } }).blob();
}

function isNotFound(error: unknown) {
    return error instanceof DOMException && error.name === "NotFoundError";
}
