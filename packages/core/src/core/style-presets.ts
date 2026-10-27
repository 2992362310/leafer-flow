import type Editor from "../editor";

export type StylePresetId = "default" | "blue" | "success" | "warning" | "danger" | "data" | "note";

export interface StylePreset {
  id: StylePresetId;
  label: string;
  fill: string;
  stroke: string;
  text: string;
  strokeWidth: number;
  connectorStroke?: string;
  dashPattern?: number[];
}

export const stylePresets: StylePreset[] = [
  {
    id: "default",
    label: "默认",
    fill: "#ffffff",
    stroke: "#475569",
    text: "#1f2937",
    strokeWidth: 2,
  },
  {
    id: "blue",
    label: "蓝色流程",
    fill: "#eff6ff",
    stroke: "#2563eb",
    text: "#1e3a8a",
    strokeWidth: 2,
    connectorStroke: "#2563eb",
  },
  {
    id: "success",
    label: "成功",
    fill: "#ecfdf5",
    stroke: "#059669",
    text: "#064e3b",
    strokeWidth: 2,
    connectorStroke: "#059669",
  },
  {
    id: "warning",
    label: "警告",
    fill: "#fffbeb",
    stroke: "#d97706",
    text: "#78350f",
    strokeWidth: 2,
    connectorStroke: "#d97706",
  },
  {
    id: "danger",
    label: "危险",
    fill: "#fef2f2",
    stroke: "#dc2626",
    text: "#7f1d1d",
    strokeWidth: 2,
    connectorStroke: "#dc2626",
  },
  {
    id: "data",
    label: "数据",
    fill: "#ecfeff",
    stroke: "#0891b2",
    text: "#164e63",
    strokeWidth: 2,
    connectorStroke: "#0891b2",
  },
  {
    id: "note",
    label: "注释",
    fill: "#f8fafc",
    stroke: "#64748b",
    text: "#334155",
    strokeWidth: 1,
    connectorStroke: "#64748b",
    dashPattern: [8, 6],
  },
];

export function applyStylePreset(editor: Editor, presetId: StylePresetId) {
  const preset = stylePresets.find((item) => item.id === presetId);
  if (!preset) return { success: false, message: "未找到样式预设" };

  const selected = editor.app.editor.list || [];
  if (!selected.length) return { success: false, message: "请先选择元素" };

  editor.documentCommands.updatePresentation(selected.map((element) => editor.renderer.getId(element)), {
    fill: preset.fill,
    stroke: preset.connectorStroke ?? preset.stroke,
    stroke_width: preset.strokeWidth,
    opacity: 1,
    text_color: preset.text,
    ...(preset.dashPattern ? { dash_pattern: preset.dashPattern } : {}),
  });
  return { success: true, message: `已应用样式：${preset.label}` };
}
