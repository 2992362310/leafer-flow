import type Editor from "../editor";

function selectedIds(editor: Editor) {
    return (editor.app.editor.list ?? []).map((item) => editor.renderer.getId(item));
}

function selectRendered(editor: Editor, ids: string[]) {
    const nodes = ids.flatMap((id) => {
        const node = editor.renderer.getNode(id);
        return node ? [node] : [];
    });
    if (nodes.length) editor.app.editor.select(nodes);
}

export function doCopy(editor: Editor): { success: boolean; message: string } {
    const ids = selectedIds(editor);
    if (!ids.length) return { success: false, message: "未选择元素" };
    try {
        const count = editor.documentCommands.copyElements(ids);
        return { success: true, message: `已复制 ${count} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "复制失败" };
    }
}

export function doCut(editor: Editor): { success: boolean; message: string } {
    const ids = selectedIds(editor);
    if (!ids.length) return { success: false, message: "未选择元素" };
    try {
        const count = editor.documentCommands.cutElements(ids);
        editor.app.editor.cancel();
        return { success: true, message: `已剪切 ${count} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "剪切失败" };
    }
}

export function doPaste(editor: Editor): { success: boolean; message: string } {
    try {
        const ids = editor.documentCommands.pasteElements();
        if (!ids.length) return { success: false, message: "剪贴板为空" };
        selectRendered(editor, ids);
        return { success: true, message: `已粘贴 ${ids.length} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "粘贴失败" };
    }
}

export function doDuplicate(editor: Editor): { success: boolean; message: string } {
    const ids = selectedIds(editor);
    if (!ids.length) return { success: false, message: "未选择元素" };
    try {
        const copies = editor.documentCommands.duplicateElements(ids);
        selectRendered(editor, copies);
        return { success: true, message: `已复制 ${copies.length} 个元素` };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "复制失败" };
    }
}
