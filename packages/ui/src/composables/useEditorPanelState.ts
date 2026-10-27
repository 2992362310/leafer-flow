import { ref, watch, type Ref } from "vue";
import { Text, type IUI } from "leafer";
import { Connector } from "@leafer-flow/core/core/connector";
import type { ConnectorRouteType, ConnectorSide, ConnectorState } from "@leafer-flow/core/core/connector";
import type { Editor } from "@leafer-flow/core";
import { applyStylePreset } from "@leafer-flow/core/core/style-presets";
import type { StylePresetId } from "@leafer-flow/core/core/style-presets";
import { getConnectorLabelTarget } from "@leafer-flow/core/core/connector-labels";
import { resolveNodeById, CUSTOM_DATA_PROP } from "@leafer-flow/core/core/flow-serialization";
import { getFlowShapeKind, updateFlowNodeShape } from "@leafer-flow/core/core/flow-node-shape";
import { useSelectionInspector } from "./useSelectionInspector";

interface EditorPanelStateOptions {
  editor: Ref<Editor | undefined>;
}

type ConnectorRoutePatch = Connector & {
  routeType?: ConnectorRouteType;
  update(): void;
};

type ConnectorCustomData = Connector & {
  [CUSTOM_DATA_PROP]?: unknown;
};

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
      connectorDescription.value = String(
        (connector as ConnectorCustomData)[CUSTOM_DATA_PROP] ?? "",
      );
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
    const el = inspector.selectedElement.value;
    if (!el) return;
    el.x = value;
    syncAfterChange();
  }

  function updateY(value: number) {
    y.value = value;
    const el = inspector.selectedElement.value;
    if (!el) return;
    el.y = value;
    syncAfterChange();
  }

  function updateWidth(value: number) {
    width.value = Math.max(1, value);
    resizeSelected(width.value, height.value);
  }

  function updateHeight(value: number) {
    height.value = Math.max(1, value);
    resizeSelected(width.value, height.value);
  }

  function updateFill(value: string) {
    fill.value = value;
    applyToSelectedShapes((shape) => {
      if (!(shape instanceof Connector)) shape.fill = value;
    });
  }

  function updateStroke(value: string) {
    stroke.value = value;
    applyToSelectedShapes((shape) => {
      shape.stroke = value;
    });
  }

  function updateStrokeWidth(value: number) {
    strokeWidth.value = value;
    applyToSelectedShapes((shape) => {
      shape.strokeWidth = value;
    });
  }

  function updateOpacity(value: number) {
    opacity.value = value;
    applyToSelectedShapes((shape) => {
      shape.opacity = value;
    });
  }

  function updateText(value: string) {
    textContent.value = value;
    const text = inspector.selectedText.value;
    if (!text) return;
    text.text = value;
    syncAfterChange();
  }

  function updateFontSize(value: number) {
    fontSize.value = value;
    applyToSelectedTexts((text) => {
      text.fontSize = value;
    });
  }

  function updateTextColor(value: string) {
    textColor.value = value;
    applyToSelectedTexts((text) => {
      text.fill = value;
    });
  }

  function updateFontWeight(value: string) {
    fontWeight.value = value;
    applyToSelectedTexts((text) => {
      (text as unknown as { fontWeight: string }).fontWeight = value;
    });
  }

  function updateFontStyle(value: string) {
    fontStyle.value = value;
    applyToSelectedTexts((text) => {
      (text as unknown as { fontStyle: string }).fontStyle = value;
    });
  }

  function updateTextAlign(value: string) {
    textAlign.value = value;
    applyToSelectedTexts((text) => {
      (text as unknown as { textAlign: string }).textAlign = value;
    });
  }

  function updateCornerRadius(value: number) {
    cornerRadius.value = value;
    applyToSelectedShapes((shape) => {
      (shape as unknown as { cornerRadius: number }).cornerRadius = value;
    });
  }

  function updateLockAspectRatio(value: boolean) {
    lockAspectRatio.value = value;
  }

  function updateLineDashed(value: boolean) {
    lineDashed.value = value;
    applyToSelectedConnectors((connector) => {
      connector.dashPattern = value ? [8, 6] : undefined;
    });
  }

  function updateArrowMode(value: "none" | "end" | "both") {
    arrowMode.value = value;
    applyToSelectedConnectors((connector) => {
      connector.startArrow = value === "both" ? "arrow" : undefined;
      connector.endArrow = value === "end" || value === "both" ? "arrow" : undefined;
    });
  }

  function updateRouteType(value: ConnectorRouteType) {
    routeType.value = value;
    applyToSelectedConnectors((connector) => {
      const editableConnector = connector as ConnectorRoutePatch;
      editableConnector.routeType = value;
      editableConnector.update();
    });
  }

  function updateLineCornerRadius(value: number) {
    lineCornerRadius.value = value;
    applyToSelectedConnectors((connector) => {
      connector.setRouteCornerRadius(value);
    });
  }

  function updateConnectorSide(which: "from" | "to", value: ConnectorSide | "auto") {
    if (which === "from") fromSide.value = value;
    else toSide.value = value;

    if (!options.editor.value) return;

    const connectors = inspector.selectedElements.value.filter(
      (el): el is Connector => el instanceof Connector,
    );
    if (!connectors.length) return;

    connectors.forEach((connector) => {
      const state = connector.getState() as ConnectorState;
      const nextState = {
        ...state,
        opt1: {
          ...(state.opt1 || {}),
          side: which === "from" ? value : fromSide.value,
          percent: 0.5,
        },
        opt2: { ...(state.opt2 || {}), side: which === "to" ? value : toSide.value, percent: 0.5 },
      } as ConnectorState;

      try {
        connector.setState(nextState, (id: string | number) =>
          resolveNodeById(options.editor.value!.app, id),
        );
      } catch (error) {
        console.warn("更新连接线锚点失败", error);
      }
    });

    syncAfterChange();
  }

  function updateConnectorDescription(value: string) {
    connectorDescription.value = value;
    const connector = inspector.selectedConnector.value;
    if (!connector) return;
    (connector as ConnectorCustomData)[CUSTOM_DATA_PROP] = value;
    syncAfterChange();
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
    if (!connector) return;
    const label = findConnectorLabel(connector);
    if (!label) return;
    label.text = value;
    syncAfterChange();
  }

  function applyTextPreset(value: string) {
    updateText(value);
  }

  function resizeSelected(nextWidth: number, nextHeight: number) {
    const el = inspector.selectedElement.value;
    if (!el) return;

    const children = getChildren(el);
    if (el.tag === "Group" && children?.length) {
      const shape = children.find((child) => !(child instanceof Text)) as IUI | undefined;
      const text = children.find((child) => child instanceof Text) as Text | undefined;
      if (shape) {
        const kind = getFlowShapeKind(shape);
        if (kind) {
          updateFlowNodeShape(shape, kind, nextWidth, nextHeight);
        } else {
          shape.width = nextWidth;
          shape.height = nextHeight;
        }
      }
      if (text) updateTextBox(text, nextWidth, nextHeight);
      el.width = nextWidth;
      el.height = nextHeight;
    } else {
      el.width = nextWidth;
      el.height = nextHeight;
    }

    syncAfterChange();
  }

  function applyToSelectedShapes(updater: (shape: IUI) => void) {
    const shapes = getSelectedShapes();
    if (!shapes.length) return;
    shapes.forEach(updater);
    syncAfterChange();
  }

  function applyToSelectedTexts(updater: (text: Text) => void) {
    const texts = getSelectedTexts();
    if (!texts.length) return;
    texts.forEach(updater);
    syncAfterChange();
  }

  function applyToSelectedConnectors(updater: (connector: Connector) => void) {
    const connectors = inspector.selectedElements.value.filter(
      (el): el is Connector => el instanceof Connector,
    );
    const currentConnector = inspector.selectedConnector.value;
    if (!connectors.length && currentConnector) connectors.push(currentConnector);
    if (!connectors.length) return;
    connectors.forEach(updater);
    syncAfterChange();
  }

  function syncAfterChange() {
    if (!options.editor.value) return;
    options.editor.value.commitMutation({ syncConnectorLabels: true });
  }

  function getSelectedShapes() {
    const shapes: IUI[] = [];
    inspector.selectedElements.value.forEach((element) => {
      if (element instanceof Connector) {
        shapes.push(element);
        return;
      }
      const children = getChildren(element);
      if (element.tag === "Group" && children?.length) {
        const shape = children.find((child) => !(child instanceof Text)) as IUI | undefined;
        if (shape) shapes.push(shape);
        return;
      }
      shapes.push(element);
    });
    return shapes;
  }

  function getSelectedTexts() {
    const texts: Text[] = [];
    inspector.selectedElements.value.forEach((element) => {
      if (element instanceof Text) {
        texts.push(element);
        return;
      }
      const children = getChildren(element);
      const text = children?.find((child) => child instanceof Text) as Text | undefined;
      if (text) texts.push(text);
    });
    return texts;
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

function getChildren(element: IUI) {
  return (element as unknown as { children?: IUI[] }).children;
}

function updateTextBox(text: Text, nextWidth: number, nextHeight: number) {
  text.x = 10;
  text.y = 10;
  text.width = Math.max(nextWidth - 20, 0);
  text.height = Math.max(nextHeight - 20, 0);
  text.visible = nextWidth > 40 && nextHeight > 30;
}

function toHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return value.slice(0, 7);
  return fallback;
}
