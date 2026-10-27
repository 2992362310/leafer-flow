import type Editor from "../editor";
import { ACTION_NAME } from "../constants";
import type { AlignAction as DocumentAlignAction } from "../document/element-operations";

type AlignAction =
    | typeof ACTION_NAME.ALIGN_LEFT
    | typeof ACTION_NAME.ALIGN_CENTER
    | typeof ACTION_NAME.ALIGN_RIGHT
    | typeof ACTION_NAME.ALIGN_TOP
    | typeof ACTION_NAME.ALIGN_MIDDLE
    | typeof ACTION_NAME.ALIGN_BOTTOM
    | typeof ACTION_NAME.DISTRIBUTE_HORIZONTAL
    | typeof ACTION_NAME.DISTRIBUTE_VERTICAL;

const ACTION_MAP: Record<AlignAction, DocumentAlignAction> = {
    [ACTION_NAME.ALIGN_LEFT]: "alignLeft",
    [ACTION_NAME.ALIGN_CENTER]: "alignCenter",
    [ACTION_NAME.ALIGN_RIGHT]: "alignRight",
    [ACTION_NAME.ALIGN_TOP]: "alignTop",
    [ACTION_NAME.ALIGN_MIDDLE]: "alignMiddle",
    [ACTION_NAME.ALIGN_BOTTOM]: "alignBottom",
    [ACTION_NAME.DISTRIBUTE_HORIZONTAL]: "distributeHorizontal",
    [ACTION_NAME.DISTRIBUTE_VERTICAL]: "distributeVertical",
};

export function doAlign(editor: Editor, action: AlignAction): { success: boolean; message: string } {
    const selected = editor.app.editor.list ?? [];
    if (selected.length < 2) return { success: false, message: "请至少选择两个元素" };
    try {
        const count = editor.documentCommands.alignElements(
            selected.map((node) => editor.renderer.getId(node)),
            ACTION_MAP[action],
        );
        return { success: count > 0, message: count ? "已调整选中元素" : "选中元素无需调整" };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "对齐失败" };
    }
}
