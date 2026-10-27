import { ref, watch, type Ref } from "vue";
import { Text, type IUI } from "leafer";
import { Connector } from "@leafer-flow/core/core/connector";
import type { ConnectorRouteType, ConnectorSide, ConnectorState } from "@leafer-flow/core/core/connector";
import type { Editor } from "@leafer-flow/core";
import { applyStylePreset } from "@leafer-flow/core/core/style-presets";
import type { StylePresetId } from "@leafer-flow/core/core/style-presets";
import { getConnectorLabelTarget } from "@leafer-flow/core/core/connector-labels";
import { useSelectionInspector } from "./useSelectionInspector";

interface EditorPanelStateOptions {
  editor: Ref<Editor | undefined>;
}

export function useEditorPanelState(options: EditorPanelStateOptions) {
  const inspector = useSelectionInspector(options);

  const x = ref(0);
  const y = ref(0);
  const width = ref(0);
  const height = ref(0);
  const fill = ref("#ffffff");
  const stroke = ref("#2563eb");
  const strokeWidth = ref(2);
  const opacity = ref(1);
  const textContent = ref("");
  const fontSize = ref(14);
  const textColor = ref("#1f2937");
  const fontWeight = ref("normal");
  const fontStyle = ref("normal");
  const textAlign = ref("center");
  const cornerRadius = ref(0);
  const lockAspectRatio = ref(false);
  const lineDashed = ref(false);
  const arrowMode = ref<"none" | "end" | "both">("end");
  const routeType = ref<ConnectorRouteType>("orthogonal");
  const lineCornerRadius = ref(10);
  const fromSide = ref<ConnectorSide | "auto">("auto");
  const toSide = ref<ConnectorSide | "auto">("auto");
  const connectorDescription = ref("");
  const connectorLabelText = ref("");
  const hasConnectorLabel = ref(false);

  watch(
    () => inspector.selectedElement.value,
    () => updateState(),
  );

  function updateState() {
    const el = inspector.selectedElement.value;
    if (!el) {
      x.value = 0;
      y.value = 0;
      width.value = 0;
      height.value = 0;
      fill.value = "#ffffff";
      stroke.value = "#2563eb";
      strokeWidth.value = 2;
      opacity.value = 1;
      textContent.value = "";
      fontSize.value = 14;
      textColor.value = "#1f2937";
      fontWeight.value = "normal";
      fontStyle.value = "normal";
      textAlign.value = "center";
      cornerRadius.value = 0;
      lineDashed.value = false;
      arrowMode.value = "end";
      routeType.value = "orthogonal";
      lineCornerRadius.value = 10;
      fromSide.value = "auto";
      toSide.value = "auto";
      connectorDescription.value = "";
      connectorLabelText.value = "";
      hasConnectorLabel.value = false;
      return;
    }

    x.value = Math.round(el.x || 0);
    y.value = Math.round(el.y || 0);
    width.value = Math.round(el.width || 0);
    height.value = Math.round(el.height || 0);

    const shape = inspector.selectedShape.value;
    if (shape) {
      fill.value = toHex(shape.fill, fill.value);
      stroke.value = toHex(shape.stroke, stroke.value);
      strokeWidth.value =
        typeof shape.strokeWidth === "number" ? shape.strokeWidth : strokeWidth.value;
      opacity.value = typeof shape.opacity === "number" ? shape.opacity : 1;
      cornerRadius.value =
        typeof (shape as unknown as { cornerRadius?: number }).cornerRadius === "number"
          ? (shape as unknown as { cornerRadius: number }).cornerRadius
          : 0;
    }

    const text = inspector.selectedText.value;
    if (text) {
      textContent.value = String(text.text ?? "");
      fontSize.value = typeof text.fontSize === "number" ? text.fontSize : 14;
      textColor.value = toHex(text.fill, textColor.value);
      fontWeight.value = String(
        (text as unknown as { fontWeight?: string }).fontWeight ?? "normal",
      );
      fontStyle.value = String((text as unknown as { fontStyle?: string }).fontStyle ?? "normal");
      textAlign.value = String((text as unknown as { textAlign?: string }).textAlign ?? "center");
    }

    const connector = inspector.selectedConnector.value;
    if (connector) {
      const state = connector.getState() as ConnectorState;
      routeType.value = state.routeType || "orthogonal";
      lineCornerRadius.value = state.cornerRadius ?? 10;
      lineDashed.value = Array.isArray(state.dashPattern) && state.dashPattern.length > 0;
      fromSide.value = state.opt1?.side || "auto";
      toSide.value = state.opt2?.side || "auto";
      const edge = options.editor.value?.document.snapshot().edges.find((item) => item.id === options.editor.value?.renderer.getId(connector));
      connectorDescription.value = String(edge?.data.customData ?? "");
      if (state.startArrow && state.endArrow) arrowMode.value = "both";
      else if (state.endArrow) arrowMode.value = "end";
      else arrowMode.value = "none";

      const label = findConnectorLabel(connector);
      hasConnectorLabel.value = !!label;
      connectorLabelText.value = label ? String(label.text ?? "") : "";
    } else {
      hasConnectorLabel.value = false;
      connectorLabelText.value = "";
    }
  }

  function handleStylePreset(presetId: StylePresetId) {
    if (!options.editor.value) return;
    applyStylePreset(options.editor.value, presetId);
    updateState();
  }

  function updateX(value: number) {
    x.value = value;
    updateSelected({ x: value });
  }

  function updateY(value: number) {
    y.value = value;
    updateSelected({ y: value });
  }

  function updateWidth(value: number) {
    width.value = Math.max(1, value);
    updateSelected({ width: width.value, height: height.value });
  }

  function updateHeight(value: number) {
    height.value = Math.max(1, value);
    updateSelected({ width: width.value, height: height.value });
  }

  function updateFill(value: string) {
    fill.value = value;
    updateSelected({ fill: value });
  }

  function updateStroke(value: string) {
    stroke.value = value;
    updateSelected({ stroke: value });
  }

  function updateStrokeWidth(value: number) {
    strokeWidth.value = value;
    updateSelected({ stroke_width: value });
  }

  function updateOpacity(value: number) {
    opacity.value = value;
    updateSelected({ opacity: value });
  }

  function updateText(value: string) {
    textContent.value = value;
    updateSelected({ text: value });
  }

  function updateFontSize(value: number) {
    fontSize.value = value;
    updateSelected({ font_size: value });
  }

  function updateTextColor(value: string) {
    textColor.value = value;
    updateSelected({ text_color: value });
  }

  function updateFontWeight(value: string) {
    fontWeight.value = value;
    updateSelected({ font_weight: value });
  }

  function updateFontStyle(value: string) {
    fontStyle.value = value;
    updateSelected({ font_style: value });
  }

  function updateTextAlign(value: string) {
    textAlign.value = value;
    updateSelected({ text_align: value });
  }

  function updateCornerRadius(value: number) {
    cornerRadius.value = value;
    updateSelected({ corner_radius: value });
  }

  function updateLockAspectRatio(value: boolean) {
    lockAspectRatio.value = value;
  }

  function updateLineDashed(value: boolean) {
    lineDashed.value = value;
    updateSelected({ dash_pattern: value ? [8, 6] : [] });
  }

  function updateArrowMode(value: "none" | "end" | "both") {
    arrowMode.value = value;
    updateSelected({
      start_arrow: value === "both" ? "arrow" : null,
      end_arrow: value === "end" || value === "both" ? "arrow" : null,
    });
  }

  function updateRouteType(value: ConnectorRouteType) {
    routeType.value = value;
    updateSelected({ route_type: value });
  }

  function updateLineCornerRadius(value: number) {
    lineCornerRadius.value = value;
    updateSelected({ route_corner_radius: value });
  }

  function updateConnectorSide(which: "from" | "to", value: ConnectorSide | "auto") {
    if (which === "from") fromSide.value = value;
    else toSide.value = value;

    updateSelected({
      from_side: fromSide.value === "auto" ? "right" : fromSide.value,
      to_side: toSide.value === "auto" ? "left" : toSide.value,
    });
  }

  function updateConnectorDescription(value: string) {
    connectorDescription.value = value;
    updateSelected({ connector_description: value });
  }

  function findConnectorLabel(connector: Connector): Text | null {
    const editor = options.editor.value;
    if (!editor) return null;
    const connectorId = connector.innerId;
    const children = editor.app.tree.children as IUI[];
    for (const child of children) {
      if (child instanceof Text && getConnectorLabelTarget(child) === connectorId) {
        return child;
      }
    }
    return null;
  }

  function updateConnectorLabelText(value: string) {
    connectorLabelText.value = value;
    const connector = inspector.selectedConnector.value;
    const editor = options.editor.value;
    if (!connector || !editor) return;
    const label = findConnectorLabel(connector);
    if (!label) return;
    const id = editor.renderer.getId(label);
    editor.documentCommands.updatePresentation([id], { text: value });
  }

  function applyTextPreset(value: string) {
    updateText(value);
  }

  function updateSelected(patch: Parameters<Editor["documentCommands"]["updatePresentation"]>[1]) {
    const editor = options.editor.value;
    if (!editor) return;
    const ids = inspector.selectedElements.value.map((element) => editor.renderer.getId(element));
    if (ids.length) editor.documentCommands.updatePresentation(ids, patch);
  }

  return {
    ...inspector,
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    opacity,
    textContent,
    fontSize,
    textColor,
    fontWeight,
    fontStyle,
    textAlign,
    cornerRadius,
    lockAspectRatio,
    lineDashed,
    arrowMode,
    routeType,
    lineCornerRadius,
    fromSide,
    toSide,
    connectorDescription,
    connectorLabelText,
    hasConnectorLabel,
    handleStylePreset,
    updateX,
    updateY,
    updateWidth,
    updateHeight,
    updateFill,
    updateStroke,
    updateStrokeWidth,
    updateOpacity,
    updateText,
    updateFontSize,
    updateTextColor,
    updateFontWeight,
    updateFontStyle,
    updateTextAlign,
    updateCornerRadius,
    updateLockAspectRatio,
    updateLineDashed,
    updateArrowMode,
    updateRouteType,
    updateLineCornerRadius,
    updateConnectorSide,
    updateConnectorDescription,
    updateConnectorLabelText,
    applyTextPreset,
  };
}

export type EditorPanelState = ReturnType<typeof useEditorPanelState>;

function toHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return value.slice(0, 7);
  return fallback;
}
