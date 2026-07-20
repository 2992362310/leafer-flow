import type Editor from "../editor";
import { getTemplateStyle, templateMap, type TemplateKind } from "../templates/defs";
import { insertTemplateFlow } from "../templates/insert";

export type { TemplateKind };

export function doInsertTemplate(
  editor: Editor,
  kind: TemplateKind,
): { success: boolean; message: string } {
  editor.beginTransaction();

  const data = templateMap[kind]();
  insertTemplateFlow(editor.app, data.graph, getTemplateStyle);

  editor.commitMutation({ syncConnectorLabels: true, autoSave: false });
  editor.endTransaction();
  editor.autoSave.save();
  return { success: true, message: data.message };
}
