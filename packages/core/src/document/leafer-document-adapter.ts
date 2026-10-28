import type { App, IUI } from "leafer";
import { Connector, createConnector } from "../core/connector";
import { CUSTOM_DATA_PROP } from "../constants";
import { normalizeAtomicGroups } from "../core/group-selection";
import {
    bindConnectorLabel,
    persistConnectorLabel,
    restoreConnectorLabelRuntimeProps,
    syncConnectorLabels,
    CONNECTOR_LABEL_PROP,
    CONNECTOR_LABEL_OFFSET_X_PROP,
    CONNECTOR_LABEL_OFFSET_Y_PROP,
} from "../core/connector-labels";
import type { DocumentEdge, DocumentEndpoint, DocumentNode, EditorDocument, JsonObject } from "./model";
import type { NodeTypeRegistry } from "../core/node-type-registry";
import type { ResourceService } from "./resources";
import { fromLeaferImageFilters } from "./image-filters";

const TRANSFORM_KEYS = ["x", "y", "width", "height", "rotation", "scaleX", "scaleY", "skewX", "skewY", "opacity"] as const;

export class LeaferDocumentAdapter {
    private ids = new WeakMap<IUI, string>();
    private models = new WeakMap<IUI, DocumentNode>();
    private visualChildren = new WeakSet<IUI>();
    private transforms = new WeakMap<IUI, Record<string, unknown>>();
    private projecting = false;

    constructor(
        private app: App,
        private nodeTypes: NodeTypeRegistry,
        private resources: ResourceService,
        private onConnectorEndpointEditEnd?: () => void,
    ) { }

    get isProjecting() { return this.projecting; }

    acceptInteraction(document: EditorDocument) {
        const runtime = new Map<string, IUI>();
        const collect = (items: IUI[]) => {
            for (const item of items) {
                runtime.set(this.getId(item), item);
                if (!(item instanceof Connector)) collect(this.documentChildren(item));
            }
        };
        collect(this.app.tree.children as IUI[]);
        const remember = (nodes: DocumentNode[]) => {
            for (const node of nodes) {
                const view = runtime.get(node.id);
                if (view) this.rememberNode(node, view);
                remember(node.children);
            }
        };
        remember(document.nodes);
    }

    getNode(id: string): IUI | undefined {
        const visit = (nodes: IUI[]): IUI | undefined => {
            for (const node of nodes) {
                if (this.ids.get(node) === id) return node;
                const found = visit(this.children(node));
                if (found) return found;
            }
        };
        return visit(this.app.tree.children as IUI[]);
    }

    getId(node: IUI): string {
        if (this.visualChildren.has(node) && node.parent) return this.getId(node.parent);
        let id = this.ids.get(node);
        if (!id) {
            id = crypto.randomUUID();
            this.ids.set(node, id);
        }
        return id;
    }

    describeNode(node: IUI): DocumentNode {
        const { data, type, version } = this.readNode(node);
        delete data.tag;
        delete data.children;
        return { id: this.getId(node), type, version, data, children: this.documentChildren(node).map((child) => this.describeNode(child)) };
    }

    readInteraction(document: EditorDocument): EditorDocument {
        const next = structuredClone(document);
        const previousEdges = new Map(document.edges.map((edge) => [edge.id, edge]));
        const runtimeIds = new Map<string, string>();
        const register = (nodes: IUI[]) => {
            for (const node of nodes) {
                runtimeIds.set(String(node.innerId), this.getId(node));
                if (!(node instanceof Connector)) register(this.documentChildren(node));
            }
        };
        register(this.app.tree.children as IUI[]);
        const edges: DocumentEdge[] = [];
        const endpoint = (id: unknown, port: unknown, point: unknown): DocumentEndpoint => {
            const nodeId = id === undefined ? undefined : runtimeIds.get(String(id));
            if (nodeId) return { nodeId, port: this.json(port ?? {}) };
            const coordinates = point as { x?: number; y?: number } | undefined;
            return { x: coordinates?.x ?? 0, y: coordinates?.y ?? 0 };
        };
        const visit = (nodes: IUI[], parentId: string | null): DocumentNode[] => {
            const output: DocumentNode[] = [];
            for (const node of nodes) {
                const id = this.getId(node);
                if (node instanceof Connector) {
                    const state = this.json(node.getState());
                    const { fromId, toId, fromPoint, toPoint, opt1, opt2, mode: _mode, ...data } = state;
                    const properties = { ...structuredClone(previousEdges.get(id)?.data ?? {}), ...data };
                    if (properties.locked !== undefined || node.locked === true) properties.locked = node.locked === true;
                    if (properties.visible !== undefined || node.visible === false) properties.visible = node.visible !== false;
                    if (properties.zIndex !== undefined || node.zIndex) properties.zIndex = Number(node.zIndex ?? 0);
                    edges.push({ id, parentId, from: endpoint(fromId, opt1, fromPoint), to: endpoint(toId, opt2, toPoint), data: properties });
                    continue;
                }
                const { data, type, version } = this.readNode(node);
                persistConnectorLabel(node, data);
                delete data.tag;
                delete data.children;
                const target = data[CONNECTOR_LABEL_PROP];
                const edgeId = target === undefined ? undefined : runtimeIds.get(String(target));
                const label = edgeId ? {
                    edgeId,
                    offsetX: Number(data[CONNECTOR_LABEL_OFFSET_X_PROP] ?? 0),
                    offsetY: Number(data[CONNECTOR_LABEL_OFFSET_Y_PROP] ?? 0),
                } : undefined;
                delete data[CONNECTOR_LABEL_PROP];
                delete data[CONNECTOR_LABEL_OFFSET_X_PROP];
                delete data[CONNECTOR_LABEL_OFFSET_Y_PROP];
                if (type === "Image" || type === "Video") {
                    const fill = data.fill && typeof data.fill === "object" && !Array.isArray(data.fill)
                        ? data.fill as JsonObject
                        : undefined;
                    const imageFill = type === "Image" && fill?.type === "image" ? fill : undefined;
                    const source = typeof imageFill?.url === "string" ? imageFill.url : data.url;
                    if (typeof source === "string") {
                        data.assetId = this.resources.capture(next, source);
                        delete data.url;
                    }
                    if (imageFill) {
                        const filters = fromLeaferImageFilters(imageFill.filter);
                        if (filters.exposure || filters.contrast || filters.saturation) data.imageFilters = filters;
                        else delete data.imageFilters;
                        delete data.fill;
                    }
                }
                output.push({ id, type, version, data, children: visit(this.documentChildren(node), id), ...(label ? { label } : {}) });
            }
            return output;
        };
        next.nodes = visit(this.app.tree.children as IUI[], null);
        next.edges = edges;
        return next;
    }

    render(document: EditorDocument) {
        this.projecting = true;
        const selection = (this.app.editor?.list as IUI[] ?? []).map((node) => this.ids.get(node));
        try {
            this.app.editor?.cancel();
            this.app.tree.clear();
            const nodes = new Map<string, IUI>();
            const childOffsets = new Map<string, number>();
            const encode = (node: DocumentNode): JsonObject => {
                const definition = this.nodeTypes.get(node.type, node.version);
                definition?.validate?.(structuredClone(node.data));
                const view = definition ? definition.render(structuredClone(node), {
                    resolveAsset: (id) => this.resources.resolve(id, document),
                }) : this.placeholder(node);
                const visual = Array.isArray(view.children) ? view.children : [];
                const children = [...visual, ...node.children.map(encode)];
                childOffsets.set(node.id, visual.length);
                return {
                    ...view,
                    ...(typeof node.data.locked === "boolean" ? { locked: node.data.locked } : {}),
                    ...(typeof node.data.visible === "boolean" ? { visible: node.data.visible } : {}),
                    ...(typeof node.data.zIndex === "number" ? { zIndex: node.data.zIndex } : {}),
                    ...(children.length ? { children } : {}),
                };
            };
            const markVisual = (runtime: IUI) => {
                this.visualChildren.add(runtime);
                this.children(runtime).forEach(markVisual);
            };
            const bind = (model: DocumentNode, runtime: IUI) => {
                this.ids.set(runtime, model.id);
                this.rememberNode(model, runtime);
                nodes.set(model.id, runtime);
                if (model.data.customData !== undefined) {
                    (runtime as IUI & Record<string, unknown>)[CUSTOM_DATA_PROP] = structuredClone(model.data.customData);
                }
                const children = this.children(runtime);
                const offset = childOffsets.get(model.id) ?? 0;
                children.slice(0, offset).forEach(markVisual);
                model.children.forEach((child, index) => bind(child, children[offset + index]));
                this.nodeTypes.get(model.type, model.version)?.hydrate?.(runtime, model);
            };
            for (const node of document.nodes) {
                this.app.tree.add(encode(node));
                bind(node, this.app.tree.children[this.app.tree.children.length - 1] as IUI);
            }
            normalizeAtomicGroups(this.app.tree.children as IUI[]);
            const connectors = new Map<string, Connector>();
            for (const edge of document.edges) {
                const connector = createConnector(this.app, this.onConnectorEndpointEditEnd);
                const parent = edge.parentId ? nodes.get(edge.parentId) : this.app.tree;
                if (!parent || !("add" in parent)) throw new Error(`Invalid connector parent: ${edge.parentId}`);
                (parent as App["tree"]).add(connector);
                connector.locked = edge.data.locked === true;
                connector.visible = edge.data.visible !== false;
                connector.zIndex = Number(edge.data.zIndex ?? 0);
                this.ids.set(connector, edge.id);
                connectors.set(edge.id, connector);
                const fromNode = "nodeId" in edge.from ? nodes.get(edge.from.nodeId) : undefined;
                const toNode = "nodeId" in edge.to ? nodes.get(edge.to.nodeId) : undefined;
                const state = {
                    ...edge.data,
                    mode: fromNode && toNode ? "node" : fromNode || toNode ? "mixed" : "point",
                    ...(fromNode && "port" in edge.from ? { fromId: fromNode.innerId, opt1: edge.from.port } : { fromPoint: edge.from }),
                    ...(toNode && "port" in edge.to ? { toId: toNode.innerId, opt2: edge.to.port } : { toPoint: edge.to }),
                };
                connector.setState(state as never, (id) => [...nodes.values()].find((node) => String(node.innerId) === String(id)));
            }
            const labels = (items: DocumentNode[]) => {
                for (const node of items) {
                    if (node.label) {
                        const runtime = nodes.get(node.id)!;
                        const connector = connectors.get(node.label.edgeId)!;
                        restoreConnectorLabelRuntimeProps(runtime, {
                            [CONNECTOR_LABEL_PROP]: connector.innerId,
                            [CONNECTOR_LABEL_OFFSET_X_PROP]: node.label.offsetX,
                            [CONNECTOR_LABEL_OFFSET_Y_PROP]: node.label.offsetY,
                        });
                        bindConnectorLabel(connector, runtime);
                    }
                    labels(node.children);
                }
            };
            labels(document.nodes);
            const reorder = (parent: App["tree"] | IUI, offset: number, elements: Array<{ id: string; order: number; zIndex?: number }>) => {
                const container = parent as unknown as { addAt(node: IUI, index: number): void };
                elements.sort((left, right) => (left.zIndex ?? left.order) - (right.zIndex ?? right.order) || left.order - right.order)
                    .forEach((element, index) => {
                        const runtime = nodes.get(element.id) ?? connectors.get(element.id);
                        if (runtime) container.addAt(runtime, offset + index);
                    });
            };
            const reorderTree = (items: DocumentNode[]) => {
                for (const node of items) {
                    const children = [...node.children, ...document.edges.filter((edge) => edge.parentId === node.id)];
                    reorder(nodes.get(node.id)!, childOffsets.get(node.id) ?? 0, children.map((item, index) => ({
                        id: item.id,
                        order: index,
                        zIndex: item.data.zIndex as number | undefined,
                    })));
                    reorderTree(node.children);
                }
            };
            const root = [
                ...document.nodes.map((node, index) => ({ id: node.id, order: index, zIndex: node.data.zIndex as number | undefined })),
                ...document.edges.filter((edge) => edge.parentId === null).map((edge, index) => ({ id: edge.id, order: document.nodes.length + index, zIndex: edge.data.zIndex as number | undefined })),
            ];
            reorder(this.app.tree, 0, root);
            reorderTree(document.nodes);
            syncConnectorLabels(this.app);
            const selected = selection.flatMap((id) => {
                const node = id ? nodes.get(id) ?? connectors.get(id) : undefined;
                return node ? [node] : [];
            });
            if (selected.length) this.app.editor?.select(selected);
        } finally {
            this.projecting = false;
        }
    }

    private children(node: IUI): IUI[] {
        return (node as IUI & { children?: IUI[] }).children ?? [];
    }

    private documentChildren(node: IUI): IUI[] {
        return this.children(node).filter((child) => !this.visualChildren.has(child));
    }

    private rememberNode(model: DocumentNode, runtime: IUI) {
        this.models.set(runtime, structuredClone(model));
        this.transforms.set(runtime, Object.fromEntries(TRANSFORM_KEYS.map((key) => [key, runtime[key]])));
    }

    private readNode(node: IUI) {
        const model = this.models.get(node);
        const view = this.json(node.toJSON());
        const definition = model ? this.nodeTypes.get(model.type, model.version) : undefined;
        const data = model
            ? definition?.read?.(structuredClone(view), structuredClone(model.data), node) ?? structuredClone(model.data)
            : view;
        if (model) {
            for (const key of TRANSFORM_KEYS) {
                const value = node[key];
                if (typeof value === "number" && !Object.is(value, this.transforms.get(node)?.[key])) data[key] = value;
            }
        }
        this.captureCustomData(node, data);
        return { data, type: model?.type ?? String(view.tag ?? node.tag), version: model?.version ?? 1 };
    }

    private placeholder(node: DocumentNode): JsonObject {
        const view: JsonObject = { tag: "Group", editable: true, name: node.type };
        for (const key of TRANSFORM_KEYS) {
            if (typeof node.data[key] === "number") view[key] = node.data[key];
        }
        const width = typeof view.width === "number" ? view.width : 160;
        const height = typeof view.height === "number" ? view.height : 80;
        view.children = [
            { tag: "Rect", width, height, fill: "#f4f4f5", stroke: "#a1a1aa", strokeWidth: 1, dashPattern: [6, 4], editable: false },
            { tag: "Text", x: 8, y: 8, width: Math.max(0, width - 16), height: Math.max(0, height - 16), text: `${node.type} v${node.version}`, fontSize: 12, fill: "#52525b", editable: false },
        ];
        return view;
    }

    private captureCustomData(node: IUI, data: JsonObject) {
        const customData = (node as IUI & Record<string, unknown>)[CUSTOM_DATA_PROP];
        if (customData !== undefined) data.customData = this.json(customData);
    }

    private json(value: unknown): JsonObject {
        return JSON.parse(JSON.stringify(value)) as JsonObject;
    }
}
