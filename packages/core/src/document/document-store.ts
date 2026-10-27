import { createDocument, validateDocument, type DocumentNode, type EditorDocument } from "./model";

export type DocumentChangeOrigin = "command" | "interaction" | "load" | "history";
export interface DocumentChange {
    origin: DocumentChangeOrigin;
    label: string;
    revision: number;
}

export interface DocumentProjection {
    apply(document: EditorDocument, origin: DocumentChangeOrigin): void;
}

export class DocumentStore {
    private state: EditorDocument;
    private listeners = new Set<(change: DocumentChange) => void>();
    private editing = false;
    private revisionValue = 0;
    private projection?: DocumentProjection;

    constructor(initial: EditorDocument = createDocument()) {
        validateDocument(initial);
        this.state = structuredClone(initial);
    }

    get revision() { return this.revisionValue; }

    snapshot(): EditorDocument {
        return structuredClone(this.state);
    }

    getNode(id: string): DocumentNode | undefined {
        const find = (nodes: DocumentNode[]): DocumentNode | undefined => {
            for (const node of nodes) {
                if (node.id === id) return node;
                const child = find(node.children);
                if (child) return child;
            }
        };
        const node = find(this.state.nodes);
        return node ? structuredClone(node) : undefined;
    }

    connect(projection: DocumentProjection) {
        if (this.projection) throw new Error("Document already has a projection");
        this.projection = projection;
        return () => { if (this.projection === projection) this.projection = undefined; };
    }

    subscribe(listener: (change: DocumentChange) => void) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    transact(label: string, edit: (draft: EditorDocument) => void): boolean {
        if (this.editing) throw new Error("Nested document transactions are not allowed");
        this.editing = true;
        try {
            const draft = this.snapshot();
            const result: unknown = edit(draft);
            if (result && typeof (result as PromiseLike<unknown>).then === "function") {
                throw new Error("Document transactions must be synchronous");
            }
            return this.commit(draft, "command", label);
        } finally {
            this.editing = false;
        }
    }

    replace(document: unknown, origin: DocumentChangeOrigin, label: string): boolean {
        if (this.editing) throw new Error("Cannot replace a document inside a transaction");
        return this.commit(document, origin, label);
    }

    private commit(document: unknown, origin: DocumentChangeOrigin, label: string): boolean {
        validateDocument(document);
        if (JSON.stringify(this.state) === JSON.stringify(document)) return false;
        const next = structuredClone(document);
        try {
            this.projection?.apply(structuredClone(next), origin);
        } catch (error) {
            try {
                this.projection?.apply(this.snapshot(), "history");
            } catch (rollbackError) {
                throw new AggregateError([error, rollbackError], "Document projection and rollback failed");
            }
            throw error;
        }
        this.state = next;
        const change = { origin, label, revision: ++this.revisionValue };
        for (const listener of this.listeners) {
            try { listener(change); } catch (error) { console.error("Document observer failed", error); }
        }
        return true;
    }

    dispose() {
        this.listeners.clear();
        this.projection = undefined;
    }
}
