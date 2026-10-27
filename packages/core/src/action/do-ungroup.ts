import type Editor from "../editor";

export function doUnGroup(editor: Editor): { success: boolean; message: string } {
    const selected = editor.app.editor.list ?? [];
    if (!selected.length) return { success: false, message: "未选择任何元素" };
    try {
        const result = editor.documentCommands.ungroupElements(selected.map((item) => editor.renderer.getId(item)));
        const released = result.ids.flatMap((id) => {
            const node = editor.renderer.getNode(id);
            return node ? [node] : [];
        });
        if (released.length) editor.app.editor.select(released);
        return { success: true, message: `已解散组合，释放 ${result.count} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "解组失败" };
    }
}
