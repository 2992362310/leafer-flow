import type Editor from "../editor";

export function doGroup(editor: Editor): { success: boolean; message: string } {
    const selected = editor.app.editor.list ?? [];
    if (!selected.length) return { success: false, message: "未选择任何元素" };
    try {
        const result = editor.documentCommands.groupElements(selected.map((item) => editor.renderer.getId(item)));
        const group = editor.renderer.getNode(result.id);
        if (group) editor.app.editor.select(group);
        return { success: true, message: `已组合 ${result.count} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "编组失败" };
    }
}
