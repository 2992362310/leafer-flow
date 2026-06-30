<script setup lang="ts">
import { computed, toRef } from "vue";
import type { Editor } from "@/editor";
import { useCollapsible, useDraggable } from "@/composables/useDraggable";
import { useEditorPanelState } from "@/composables/useEditorPanelState";
import type { PropertyPanelContext } from "@/editor/api/property-panel";
import PropertyPanelHost from "@/components/EditorPanel/PropertyPanelHost.vue";
import { usePanelDock } from "@/composables/usePanelDock";

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
const { isPanelDocked, togglePanelDock } = usePanelDock();
const isDocked = computed(() => isPanelDocked("property-panel"));

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
    <div v-if="panelState.hasSelection.value && propertyPanelContext && !isDocked"
      class="card shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden transition-[height]"
      :style="{ left: `${position.x}px`, top: `${position.y}px`, width: '16rem' }">
      <div class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none" @mousedown="startDrag">
        <div class="text-xs font-bold">属性</div>
        <div class="flex items-center gap-0.5">
          <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('property-panel')"
            @mousedown.stop>
            <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
          </button>
          <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse(isDragging)" @mousedown.stop
            :title="isCollapsed ? '展开属性' : '折叠属性'">
            <span class="text-sm">{{ isCollapsed ? "∨" : "∧" }}</span>
          </button>
        </div>
      </div>

      <div class="card-body p-3 pt-2 max-h-[70vh] overflow-y-auto" v-show="!isCollapsed">
        <div v-if="panelState.isMultiSelection.value" class="alert alert-info py-2 px-3 text-xs">
          已选择 {{ panelState.selectedElements.value.length }} 个元素，可批量修改样式
        </div>

        <PropertyPanelHost v-if="props.editor && propertyPanelContext" :editor="props.editor"
          :context="propertyPanelContext" :panel-state="panelState" :panels="visiblePanels" />
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
