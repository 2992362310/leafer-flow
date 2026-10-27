import type { NodeTypeContribution } from "../api/node-type";

export class NodeTypeRegistry {
    private contributions = new Map<string, { contribution: NodeTypeContribution }>();
    private listeners = new Set<() => void>();

    register(contribution: NodeTypeContribution): () => void {
        if (!contribution.type.trim() || !contribution.label.trim()) throw new Error("Node type and label are required");
        if (!Number.isInteger(contribution.version) || contribution.version < 1) throw new Error("Invalid node type version");
        if (this.contributions.has(contribution.type)) throw new Error(`Node type already registered: ${contribution.type}`);
        const record = { contribution };
        this.contributions.set(contribution.type, record);
        try {
            this.notify();
        } catch (error) {
            this.contributions.delete(contribution.type);
            try { this.notify(); } catch (rollbackError) {
                throw new AggregateError([error, rollbackError], "Node type registration rollback failed");
            }
            throw error;
        }
        return () => {
            if (this.contributions.get(contribution.type) === record) this.unregister(contribution.type);
        };
    }

    get(type: string, version?: number): NodeTypeContribution | undefined {
        const contribution = this.contributions.get(type)?.contribution;
        return contribution && (version === undefined || contribution.version === version) ? contribution : undefined;
    }

    unregister(type: string) {
        if (this.contributions.delete(type)) this.notify();
    }

    unregisterByPlugin(pluginId: string) {
        let changed = false;
        for (const [type, { contribution }] of this.contributions) {
            if (contribution.pluginId !== pluginId) continue;
            this.contributions.delete(type);
            changed = true;
        }
        if (changed) this.notify();
    }

    list(): NodeTypeContribution[] {
        return [...this.contributions.values()].map(({ contribution }) => contribution);
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private notify() {
        for (const listener of this.listeners) listener();
    }
}
