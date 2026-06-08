<script setup lang="ts">
import { toRef } from "vue";
import type { ConnectorRouteType, ConnectorSide } from "leafer-connector";
import type { Editor } from "../editor";
import { stylePresets } from "../editor/core/style-presets";
import type { StylePresetId } from "../editor/core/style-presets";
import { useCollapsible, useDraggable } from "../composables/useDraggable";
import { useEditorPanelState } from "../composables/useEditorPanelState";

const props = defineProps<{ editor: Editor | undefined }>();

const {
  selectedElements,
  selectedShape,
  selectedText,
  selectedConnector,
  selectedConnectorLabel,
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
  lineDashed,
  arrowMode,
  routeType,
  lineCornerRadius,
  fromSide,
  toSide,
  connectorDescription,
  isMultiSelection,
  hasSelection,
  hasSelectedConnector,
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
  updateLineDashed,
  updateArrowMode,
  updateRouteType,
  updateLineCornerRadius,
  updateConnectorSide,
  updateConnectorDescription,
  applyTextPreset,
} = useEditorPanelState({ editor: toRef(props, "editor") });

const { position, isDragging, startDrag } = useDraggable({ initialX: 340, initialY: 110 });
const { isCollapsed, toggleCollapse } = useCollapsible(false);
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="hasSelection"
      class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden transition-[height]"
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
