import type { EditorPluginModule, JsonObject } from "@leafer-flow/core";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";

const PLUGIN_ID = "leafer-flow.task-node";
const NODE_TYPE = "leafer-flow.task";
const STATUS_LABELS: Record<string, string> = { todo: "待处理", doing: "进行中", done: "已完成" };

function selectedTask(context: PropertyPanelContext) {
    if (!context.selectedElement || context.isMultiSelection) return undefined;
    const node = context.editor.document.getNode(context.editor.renderer.getId(context.selectedElement));
    return node?.type === NODE_TYPE ? node : undefined;
}

export const taskNodePlugin: EditorPluginModule = {
    manifest: {
        id: PLUGIN_ID,
        name: "任务节点",
        version: "1.0.0",
        description: "提供带标题和处理状态的业务节点。",
        category: "shape",
        capabilities: ["node-type", "command", "property-panel", "action-button"],
        enabledByDefault: true,
    },
    contributes: {
        nodeTypes: [NODE_TYPE],
        commands: ["创建任务节点"],
        propertyPanels: ["任务属性"],
        buttons: ["任务节点"],
    },
    activate(ctx) {
        ctx.onDispose(ctx.editor.nodeTypes.register({
            type: NODE_TYPE,
            version: 1,
            label: "任务节点",
            pluginId: PLUGIN_ID,
            defaults: { title: "新任务", status: "todo", x: 120, y: 120, width: 180, height: 88 },
            validate(data) {
                if (typeof data.title !== "string" || !Object.hasOwn(STATUS_LABELS, String(data.status))) {
                    throw new Error("任务标题或状态无效");
                }
                for (const key of ["width", "height"]) {
                    if (typeof data[key] !== "number" || !Number.isFinite(data[key]) || data[key] <= 0) {
                        throw new Error("任务节点尺寸必须为正数");
                    }
                }
            },
            render(node) {
                const width = Number(node.data.width);
                const height = Number(node.data.height);
                const view: JsonObject = {
                    tag: "Group",
                    name: String(node.data.title),
                    x: node.data.x ?? 0,
                    y: node.data.y ?? 0,
                    width,
                    height,
                    editable: true,
                    children: [
                        { tag: "Rect", width, height, fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 1, cornerRadius: 6, editable: false },
                        { tag: "Text", x: 12, y: 12, width: Math.max(0, width - 24), height: 24, text: String(node.data.title), fontSize: 15, fill: "#18181b", editable: false },
                        { tag: "Text", x: 12, y: Math.max(36, height - 30), width: Math.max(0, width - 24), height: 20, text: STATUS_LABELS[String(node.data.status)], fontSize: 12, fill: node.data.status === "done" ? "#15803d" : "#52525b", editable: false },
                    ],
                };
                for (const key of ["rotation", "scaleX", "scaleY", "skewX", "skewY", "opacity"]) {
                    if (typeof node.data[key] === "number") view[key] = node.data[key];
                }
                return view;
            },
        }));

        ctx.editor.commands.register({
            id: "taskNode.create",
            label: "创建任务节点",
            pluginId: PLUGIN_ID,
            run(editor) {
                const id = editor.documentCommands.createNode(NODE_TYPE);
                const view = editor.renderer.getNode(id);
                if (view) editor.app.editor.select(view);
                return { success: true, message: "已创建任务节点" };
            },
        });
        ctx.editor.actionButtons.register({
            id: "task-node",
            label: "任务节点",
            icon: "draw_rect",
            pluginId: PLUGIN_ID,
            kind: "button",
            surface: "edit",
            order: 90,
            items: [{ id: "create-task-node", label: "任务节点", command: "taskNode.create", icon: "draw_rect" }],
        });
        ctx.editor.propertyPanels.registerFields({
            id: "task-node.properties",
            title: "任务属性",
            pluginId: PLUGIN_ID,
            order: 5,
            match: (context) => Boolean(selectedTask(context)),
            fields: [
                {
                    key: "title", label: "标题", type: "text",
                    getValue: (context) => String(selectedTask(context)?.data.title ?? ""),
                    setValue(context, value) {
                        const node = selectedTask(context);
                        if (node) context.editor.documentCommands.updateNode(node.id, { title: String(value) });
                    },
                },
                {
                    key: "status", label: "状态", type: "select",
                    options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                    getValue: (context) => selectedTask(context)?.data.status ?? "todo",
                    setValue(context, value) {
                        const node = selectedTask(context);
                        if (node) context.editor.documentCommands.updateNode(node.id, { status: String(value) });
                    },
                },
            ],
        });
    },
};
