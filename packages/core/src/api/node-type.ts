import type { DocumentNode, JsonObject } from "../document/model";
import type { IUI } from "leafer";

export interface NodeRenderContext {
    resolveAsset(id: string): string;
}

export interface NodeTypeContribution {
    type: string;
    version: number;
    label: string;
    pluginId?: string;
    defaults?: JsonObject;
    acceptsChildren?: boolean;
    validate?(data: JsonObject): void;
    render(node: DocumentNode, context: NodeRenderContext): JsonObject;
    hydrate?(view: IUI, node: DocumentNode): void;
    read?(view: JsonObject, previous: JsonObject, runtime?: IUI): JsonObject;
}
