<script setup lang="ts">
import { computed, toRef } from "vue";
import type { Editor } from "@leafer-flow/core";
import { useCollapsible, useDraggable } from "../composables/useDraggable";
import { useEditorPanelState } from "../composables/useEditorPanelState";
import type { PropertyPanelContext } from "@leafer-flow/core/api/property-panel";
import PropertyPanelHost from "./EditorPanel/PropertyPanelHost.vue";
import { usePanelDock, usePanelMode } from "../composables/usePanelDock";
import PanelFlyoutWrapper from "./PanelFlyoutWrapper.vue";
import FloatingPanelShell from "./FloatingPanelShell.vue";

const props = defineProps<{ editor: Editor | undefined }>();

const panelState = useEditorPanelState({ editor: toRef(props, "editor") });

const { position, isDragging, startDrag } = useDraggable({
  initialX: 340,
  initialY: 110,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 256,
  panelHeight: 520,
  margin: 8,
});
const { isCollapsed, toggleCollapse } = useCollapsible(false);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("property-panel");
const isDocked = computed(() => mode.value !== "float");

const propertyPanelContext = computed<PropertyPanelContext | null>(() => {
  if (!props.editor) return null;

  return {
    editor: props.editor,
    selectedElement: panelState.selectedElement.value,
    selectedElements: panelState.selectedElements.value,
    selectedShape: panelState.selectedShape.value,
    selectedText: panelState.selectedText.value,
    selectedConnector: panelState.selectedConnector.value,
    selectedConnectorLabel: panelState.selectedConnectorLabel.value,
    isMultiSelection: panelState.isMultiSelection.value,
    hasSelection: panelState.hasSelection.value,
    hasSelectedConnector: panelState.hasSelectedConnector.value,
  };
});

const visiblePanels = computed(() => {
  const context = propertyPanelContext.value;
  if (!props.editor || !context) return [];
  return props.editor.propertyPanels.listMatched(context);
});
</script>

<template>
  <Transition name="slide-fade">
    <FloatingPanelShell v-if="panelState.hasSelection.value && propertyPanelContext && mode === 'float'" title="属性"
      icon="sliders" :position="position" :width="256" max-height="min(70vh, 38rem)" :z-index="10"
      @drag-start="startDrag">
      <template #actions>
        <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('property-panel')">
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>
        <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse(isDragging)" @mousedown.stop
          :title="isCollapsed ? '展开属性' : '折叠属性'">
          <span class="text-sm">{{ isCollapsed ? "∨" : "∧" }}</span>
        </button>
      </template>

      <div class="min-h-0 flex-1 overflow-y-auto p-3 pt-2" v-show="!isCollapsed">
        <div v-if="panelState.isMultiSelection.value" class="alert alert-info py-2 px-3 text-xs">
          已选择 {{ panelState.selectedElements.value.length }} 个元素，可批量修改样式
        </div>

        <PropertyPanelHost v-if="props.editor && propertyPanelContext" :editor="props.editor"
          :context="propertyPanelContext" :panel-state="panelState" :panels="visiblePanels" />
      </div>
    </FloatingPanelShell>
  </Transition>

  <PanelFlyoutWrapper v-if="mode === 'flyout'" panel-id="property-panel" title="属性" icon="sliders" :width="256">
    <div class="p-3 pt-2">
      <div v-if="!panelState.hasSelection.value" class="text-xs opacity-50 text-center py-6">请先选中元素</div>
      <template v-else-if="props.editor && propertyPanelContext">
        <div v-if="panelState.isMultiSelection.value" class="alert alert-info py-2 px-3 text-xs mb-3">
          已选择 {{ panelState.selectedElements.value.length }} 个元素，可批量修改样式
        </div>
        <PropertyPanelHost :editor="props.editor" :context="propertyPanelContext" :panel-state="panelState"
          :panels="visiblePanels" />
      </template>
    </div>
  </PanelFlyoutWrapper>
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
