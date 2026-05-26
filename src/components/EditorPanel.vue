<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { Text, type IUI } from "leafer";
import { Connector } from "leafer-connector";
import type { ConnectorRouteType, ConnectorSide, ConnectorState } from "leafer-connector";
import { EditorEvent } from "leafer-editor";
import type { Editor } from "../editor";
import { applyStylePreset, stylePresets } from "../editor";
import type { StylePresetId } from "../editor/core/style-presets";
import { useCollapsible, useDraggable } from "../composables/useDraggable";
import {
  captureSelectedConnectorLabelOffsets,
  getConnectorLabelTarget,
  syncConnectorLabels,
} from "../editor/core/connector-labels";
import { resolveNodeById, CUSTOM_DATA_PROP } from "../editor/core/flow-serialization";

const props = defineProps<{ editor: Editor | undefined }>();

const selectedElement = ref<IUI | null>(null);
const selectedElements = ref<IUI[]>([]);
const selectedShape = ref<IUI | null>(null);
const selectedText = ref<Text | null>(null);
const selectedConnector = ref<Connector | null>(null);
const selectedConnectorLabel = ref(false);

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
const lineDashed = ref(false);
const arrowMode = ref<"none" | "end" | "both">("end");
const routeType = ref<ConnectorRouteType>("orthogonal");
const lineCornerRadius = ref(10);
const fromSide = ref<ConnectorSide | "auto">("auto");
const toSide = ref<ConnectorSide | "auto">("auto");
const connectorDescription = ref("");

let cleanups: (() => void)[] = [];

const isMultiSelection = computed(() => selectedElements.value.length > 1);
const hasSelection = computed(() => Boolean(selectedElement.value));
const hasSelectedConnector = computed(() =>
  selectedElements.value.some((el) => el instanceof Connector),
);

watch(
  () => props.editor,
  (newEditor) => {
    cleanupListeners();
    if (!newEditor?.app?.editor) return;

    const editorPlugin = newEditor.app.editor;
    editorPlugin.on(EditorEvent.SELECT, onSelect);
    editorPlugin.on("move.end", updateState);
    editorPlugin.on("resize.end", updateState);
    editorPlugin.on("rotate.end", updateState);
    cleanups = [
      () => editorPlugin.off(EditorEvent.SELECT, onSelect),
      () => editorPlugin.off("move.end", updateState),
      () => editorPlugin.off("resize.end", updateState),
      () => editorPlugin.off("rotate.end", updateState),
    ];
  },
  { immediate: true },
);

onUnmounted(cleanupListeners);

function cleanupListeners() {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
}

function onSelect(e: EditorEvent) {
  const list = (e.editor.list || []) as IUI[];
  selectedElements.value = [...list];
  selectedElement.value = list[0] || null;
  selectedConnectorLabel.value = Boolean(
    selectedElement.value && getConnectorLabelTarget(selectedElement.value),
  );
  resolveSelectedParts();
  updateState();
}

function resolveSelectedParts() {
  const el = selectedElement.value;
  selectedShape.value = null;
  selectedText.value = null;
  selectedConnector.value = null;
  if (!el) return;

  if (el instanceof Connector) {
    selectedConnector.value = el;
    selectedShape.value = el;
    return;
  }

  if (el instanceof Text) {
    selectedText.value = el;
    selectedShape.value = el;
    return;
  }

  const children = (el as unknown as { children?: IUI[] }).children;
  if (el.tag === "Group" && children?.length) {
    selectedShape.value = children.find((child) => !(child instanceof Text)) || children[0] || null;
    selectedText.value =
      (children.find((child) => child instanceof Text) as Text | undefined) || null;
    return;
  }

  selectedShape.value = el;
}

function updateState() {
  const el = selectedElement.value;
  if (!el) return;

  x.value = Math.round(el.x || 0);
  y.value = Math.round(el.y || 0);
  width.value = Math.round(el.width || 0);
  height.value = Math.round(el.height || 0);

  const shape = selectedShape.value;
  if (shape) {
    fill.value = toHex(shape.fill, fill.value);
    stroke.value = toHex(shape.stroke, stroke.value);
    strokeWidth.value =
      typeof shape.strokeWidth === "number" ? shape.strokeWidth : strokeWidth.value;
    opacity.value = typeof shape.opacity === "number" ? shape.opacity : 1;
  }

  const text = selectedText.value;
  if (text) {
    textContent.value = String(text.text ?? "");
    fontSize.value = typeof text.fontSize === "number" ? text.fontSize : 14;
    textColor.value = toHex(text.fill, textColor.value);
  }

  const connector = selectedConnector.value;
  if (connector) {
    const state = connector.getState() as ConnectorState;
    routeType.value = state.routeType || "orthogonal";
    lineCornerRadius.value = state.cornerRadius ?? 10;
    lineDashed.value = Array.isArray(state.dashPattern) && state.dashPattern.length > 0;
    fromSide.value = state.opt1?.side || "auto";
    toSide.value = state.opt2?.side || "auto";
    connectorDescription.value = String(
      (connector as Record<string, unknown>)[CUSTOM_DATA_PROP] ?? "",
    );
    if (state.startArrow && state.endArrow) arrowMode.value = "both";
    else if (state.endArrow) arrowMode.value = "end";
    else arrowMode.value = "none";
  }
}

function handleStylePreset(presetId: StylePresetId) {
  if (!props.editor) return;
  applyStylePreset(props.editor, presetId);
  updateState();
}

function saveHistory() {
  props.editor?.history.save();
  props.editor?.autoSave.save();
}

function updateX(value: number) {
  x.value = value;
  if (!selectedElement.value) return;
  selectedElement.value.x = value;
  syncAfterChange();
}

function updateY(value: number) {
  y.value = value;
  if (!selectedElement.value) return;
  selectedElement.value.y = value;
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
  if (!selectedText.value) return;
  selectedText.value.text = value;
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
    connector.routeType = value;
    connector.update();
  });
}

function updateLineCornerRadius(value: number) {
  lineCornerRadius.value = value;
  applyToSelectedConnectors((connector) => {
    connector.cornerRadius = value;
    connector.update();
  });
}

function updateConnectorSide(which: "from" | "to", value: ConnectorSide | "auto") {
  if (which === "from") fromSide.value = value;
  else toSide.value = value;

  if (!props.editor) return;

  const connectors = selectedElements.value.filter(
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
        resolveNodeById(props.editor!.app, id),
      );
    } catch (error) {
      console.warn("更新连接线锚点失败", error);
    }
  });

  syncAfterChange();
}

function updateConnectorDescription(value: string) {
  connectorDescription.value = value;
  if (!selectedConnector.value) return;
  (selectedConnector.value as Record<string, unknown>)[CUSTOM_DATA_PROP] = value;
  syncAfterChange();
}

function applyTextPreset(value: string) {
  updateText(value);
}

function resizeSelected(nextWidth: number, nextHeight: number) {
  const el = selectedElement.value;
  if (!el) return;

  const children = (el as unknown as { children?: IUI[] }).children;
  if (el.tag === "Group" && children?.length) {
    const shape = children.find((child) => !(child instanceof Text)) as IUI | undefined;
    const text = children.find((child) => child instanceof Text) as Text | undefined;
    if (shape) {
      shape.width = nextWidth;
      shape.height = nextHeight;
      if (shape.tag === "Path") updatePathShape(shape, nextWidth, nextHeight);
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
  const connectors = selectedElements.value.filter(
    (el): el is Connector => el instanceof Connector,
  );
  if (!connectors.length && selectedConnector.value) connectors.push(selectedConnector.value);
  if (!connectors.length) return;
  connectors.forEach(updater);
  syncAfterChange();
}

function syncAfterChange() {
  if (!props.editor) return;
  captureSelectedConnectorLabelOffsets(props.editor.app);
  syncConnectorLabels(props.editor.app);
  saveHistory();
}

function getSelectedShapes() {
  const shapes: IUI[] = [];
  selectedElements.value.forEach((element) => {
    if (element instanceof Connector) {
      shapes.push(element);
      return;
    }
    const children = (element as unknown as { children?: IUI[] }).children;
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
  selectedElements.value.forEach((element) => {
    if (element instanceof Text) {
      texts.push(element);
      return;
    }
    const children = (element as unknown as { children?: IUI[] }).children;
    const text = children?.find((child) => child instanceof Text) as Text | undefined;
    if (text) texts.push(text);
  });
  return texts;
}

function updateTextBox(text: Text, nextWidth: number, nextHeight: number) {
  text.x = 10;
  text.y = 10;
  text.width = Math.max(nextWidth - 20, 0);
  text.height = Math.max(nextHeight - 20, 0);
  text.visible = nextWidth > 40 && nextHeight > 30;
}

function updatePathShape(shape: IUI, nextWidth: number, nextHeight: number) {
  const currentPath = String(shape.path || "");
  if (currentPath.includes("Q")) return;
  const centerX = nextWidth / 2;
  const centerY = nextHeight / 2;
  shape.path = `M ${centerX} 0 L ${nextWidth} ${centerY} L ${centerX} ${nextHeight} L 0 ${centerY} Z`;
}

function toHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return value.slice(0, 7);
  return fallback;
}

const { position, isDragging, startDrag } = useDraggable({ initialX: 340, initialY: 110 });
const { isCollapsed, toggleCollapse } = useCollapsible(false);
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="hasSelection"
      class="card bg-base-100 shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden transition-[height]"
      :style="{ left: `${position.x}px`, top: `${position.y}px`, width: '16rem' }"
    >
      <div
        class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none"
        @mousedown="startDrag"
      >
        <div class="text-xs font-bold">属性</div>
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="toggleCollapse(isDragging)"
          @mousedown.stop
          :title="isCollapsed ? '展开属性' : '折叠属性'"
        >
          <span class="text-sm">{{ isCollapsed ? "∨" : "∧" }}</span>
        </button>
      </div>

      <div class="card-body p-3 pt-2 max-h-[70vh] overflow-y-auto" v-show="!isCollapsed">
        <div v-if="isMultiSelection" class="alert alert-info py-2 px-3 text-xs">
          已选择 {{ selectedElements.length }} 个元素，可批量修改样式
        </div>

        <div class="mb-1">
          <div class="mb-1 text-xs font-semibold text-base-content/70">样式预设</div>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="preset in stylePresets"
              :key="preset.id"
              class="btn btn-xs justify-start gap-2"
              @click="handleStylePreset(preset.id as StylePresetId)"
            >
              <span
                class="h-3 w-3 rounded border"
                :style="{ backgroundColor: preset.fill, borderColor: preset.stroke }"
              ></span>
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div v-if="!isMultiSelection" class="grid grid-cols-2 gap-2">
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">X</span></div>
            <input
              type="number"
              :value="x"
              @input="(e) => updateX(Number((e.target as HTMLInputElement).value))"
              class="input input-bordered input-xs w-full"
            />
          </label>
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">Y</span></div>
            <input
              type="number"
              :value="y"
              @input="(e) => updateY(Number((e.target as HTMLInputElement).value))"
              class="input input-bordered input-xs w-full"
            />
          </label>
        </div>

        <div v-if="!selectedConnector && !isMultiSelection" class="grid grid-cols-2 gap-2">
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">宽</span></div>
            <input
              type="number"
              min="1"
              :value="width"
              @input="(e) => updateWidth(Number((e.target as HTMLInputElement).value))"
              class="input input-bordered input-xs w-full"
            />
          </label>
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">高</span></div>
            <input
              type="number"
              min="1"
              :value="height"
              @input="(e) => updateHeight(Number((e.target as HTMLInputElement).value))"
              class="input input-bordered input-xs w-full"
            />
          </label>
        </div>

        <div v-if="selectedShape && !selectedConnector" class="grid grid-cols-2 gap-2">
          <label class="form-control">
            <div class="label p-1"><span class="label-text text-xs">填充</span></div>
            <input
              type="color"
              :value="fill"
              @input="(e) => updateFill((e.target as HTMLInputElement).value)"
              class="h-7 w-full cursor-pointer rounded border border-base-300"
            />
          </label>
          <label class="form-control">
            <div class="label p-1"><span class="label-text text-xs">边框</span></div>
            <input
              type="color"
              :value="stroke"
              @input="(e) => updateStroke((e.target as HTMLInputElement).value)"
              class="h-7 w-full cursor-pointer rounded border border-base-300"
            />
          </label>
        </div>

        <label v-if="selectedShape" class="form-control w-full">
          <div class="label p-1">
            <span class="label-text text-xs">线宽</span>
            <span class="label-text-alt text-xs">{{ strokeWidth }}</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            :value="strokeWidth"
            @input="(e) => updateStrokeWidth(Number((e.target as HTMLInputElement).value))"
            class="range range-xs"
          />
        </label>

        <label v-if="selectedShape" class="form-control w-full">
          <div class="label p-1">
            <span class="label-text text-xs">透明度</span>
            <span class="label-text-alt text-xs">{{ opacity }}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            :value="opacity"
            @input="(e) => updateOpacity(Number((e.target as HTMLInputElement).value))"
            class="range range-xs"
          />
        </label>

        <template v-if="hasSelectedConnector">
          <div class="divider my-1">连接线</div>

          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">路径</span></div>
            <select
              class="select select-bordered select-xs w-full"
              :value="routeType"
              @change="
                (e) => updateRouteType((e.target as HTMLSelectElement).value as ConnectorRouteType)
              "
            >
              <option value="orthogonal">折线</option>
              <option value="bezier">贝塞尔</option>
              <option value="straight">直线</option>
            </select>
          </label>

          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">箭头</span></div>
            <select
              class="select select-bordered select-xs w-full"
              :value="arrowMode"
              @change="
                (e) =>
                  updateArrowMode((e.target as HTMLSelectElement).value as 'none' | 'end' | 'both')
              "
            >
              <option value="none">无箭头</option>
              <option value="end">终点箭头</option>
              <option value="both">双向箭头</option>
            </select>
          </label>

          <label class="label cursor-pointer justify-start gap-2 px-1">
            <input
              type="checkbox"
              class="toggle toggle-xs"
              :checked="lineDashed"
              @change="(e) => updateLineDashed((e.target as HTMLInputElement).checked)"
            />
            <span class="label-text text-xs">虚线</span>
          </label>

          <label class="form-control w-full">
            <div class="label p-1">
              <span class="label-text text-xs">圆角</span>
              <span class="label-text-alt text-xs">{{ lineCornerRadius }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              :value="lineCornerRadius"
              @input="(e) => updateLineCornerRadius(Number((e.target as HTMLInputElement).value))"
              class="range range-xs"
            />
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="form-control w-full">
              <div class="label p-1"><span class="label-text text-xs">起点锚点</span></div>
              <select
                class="select select-bordered select-xs w-full"
                :value="fromSide"
                @change="
                  (e) =>
                    updateConnectorSide(
                      'from',
                      (e.target as HTMLSelectElement).value as ConnectorSide | 'auto',
                    )
                "
              >
                <option value="auto">自动</option>
                <option value="top">上</option>
                <option value="right">右</option>
                <option value="bottom">下</option>
                <option value="left">左</option>
              </select>
            </label>
            <label class="form-control w-full">
              <div class="label p-1"><span class="label-text text-xs">终点锚点</span></div>
              <select
                class="select select-bordered select-xs w-full"
                :value="toSide"
                @change="
                  (e) =>
                    updateConnectorSide(
                      'to',
                      (e.target as HTMLSelectElement).value as ConnectorSide | 'auto',
                    )
                "
              >
                <option value="auto">自动</option>
                <option value="top">上</option>
                <option value="right">右</option>
                <option value="bottom">下</option>
                <option value="left">左</option>
              </select>
            </label>
          </div>

          <label v-if="!isMultiSelection" class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">描述</span></div>
            <textarea
              :value="connectorDescription"
              @input="(e) => updateConnectorDescription((e.target as HTMLTextAreaElement).value)"
              class="textarea textarea-bordered textarea-xs w-full min-h-14 resize-y"
              placeholder="可选的自定义描述..."
            ></textarea>
          </label>
        </template>

        <template v-if="selectedText">
          <div class="divider my-1">文本</div>

          <label v-if="!isMultiSelection" class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">内容</span></div>
            <textarea
              :value="textContent"
              @input="(e) => updateText((e.target as HTMLTextAreaElement).value)"
              class="textarea textarea-bordered textarea-xs w-full min-h-16 resize-y"
            ></textarea>
          </label>

          <div v-if="selectedConnectorLabel && !isMultiSelection" class="grid grid-cols-4 gap-1">
            <button class="btn btn-xs" @click="applyTextPreset('是')">是</button>
            <button class="btn btn-xs" @click="applyTextPreset('否')">否</button>
            <button class="btn btn-xs" @click="applyTextPreset('通过')">通过</button>
            <button class="btn btn-xs" @click="applyTextPreset('驳回')">驳回</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <label class="form-control">
              <div class="label p-1"><span class="label-text text-xs">文字色</span></div>
              <input
                type="color"
                :value="textColor"
                @input="(e) => updateTextColor((e.target as HTMLInputElement).value)"
                class="h-7 w-full cursor-pointer rounded border border-base-300"
              />
            </label>
            <label class="form-control">
              <div class="label p-1">
                <span class="label-text text-xs">字号</span>
                <span class="label-text-alt text-xs">{{ fontSize }}</span>
              </div>
              <input
                type="range"
                min="8"
                max="72"
                step="1"
                :value="fontSize"
                @input="(e) => updateFontSize(Number((e.target as HTMLInputElement).value))"
                class="range range-xs mt-2"
              />
            </label>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}
</style>
