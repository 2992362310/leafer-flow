<script setup lang="ts">
import { ref, onUnmounted, shallowRef, watch, provide } from "vue";
import type { IUI } from "@leafer-ui/interface";
import type { Editor } from "@/editor";
import { ACTION_NAME } from "@/editor/constants";
import LayerItem from "./LayerItem.vue";
import { useDraggable, useCollapsible } from "@/composables/useDraggable";
import { usePanelDock, usePanelMode } from "@/composables/usePanelDock";
import PanelFlyoutWrapper from "@/components/PanelFlyoutWrapper.vue";

const props = defineProps<{
  editor?: Editor;
  open?: boolean;
}>();

const treeData = shallowRef<IUI[]>([]);
const selectedIds = ref<number[]>([]);
const treeVersion = ref(0);

// 提供给子组件的移动方法
provide("layerContext", {
  moveLayer,
});

async function moveLayer(
  dragId: number,
  dropId: number,
  dropPosition: "top" | "bottom" | "inside",
) {
  if (!props.editor) return;

  const result = await props.editor.commands.execute(ACTION_NAME.MOVE_LAYER, {
    dragId,
    dropId,
    dropPosition,
  });

  if (result.success) updateTree();
}

// 监听器清理函数
let cleanups: (() => void)[] = [];

function updateTree() {
  if (!props.editor?.app?.tree) return;
  // 浅拷贝触发更新
  const children = props.editor.app.tree.children || [];
  // 我们需要在 template 里 reverse，这里只存原始引用
  treeData.value = [...children];
  // 更新版本号，触发子组件刷新
  treeVersion.value++;
}

function updateSelection() {
  if (!props.editor?.app?.editor) return;
  const list = props.editor.app.editor.list || [];
  selectedIds.value = list.map((item) => item.innerId);
}

function initListeners() {
  const { app } = props.editor!;
  if (!app) return;

  const onTreeChange = () => {
    updateTree();
  };

  const onSelectionChange = () => {
    updateSelection();
  };

  // 监听画布内容的增删
  if (app.tree) {
    app.tree.on("child.add", onTreeChange);
    app.tree.on("child.remove", onTreeChange);
    app.tree.on("clear", onTreeChange);

    cleanups.push(() => {
      app.tree.off("child.add", onTreeChange);
      app.tree.off("child.remove", onTreeChange);
      app.tree.off("clear", onTreeChange);
    });
  }

  // 监听选择变化
  if (app.editor) {
    app.editor.on("select", onSelectionChange);
    cleanups.push(() => {
      app.editor.off("select", onSelectionChange);
    });
  } else {
    // 延迟重试，等待 editor 就绪
    setTimeout(() => {
      if (app.editor) {
        app.editor.on("select", onSelectionChange);
        cleanups.push(() => {
          app.editor.off("select", onSelectionChange);
        });
        updateSelection();
      }
    }, 0);
  }
}

// 事件处理
function handleSelect(node: IUI) {
  if (!props.editor || !props.editor.app.editor) return;
  props.editor.app.editor.select(node);
}

async function runLayerCommand(node: IUI, action: string) {
  if (!props.editor) return;
  props.editor.app.editor.select(node);
  const result = await props.editor.commands.execute(action);
  props.editor.app.editor.select(node);
  if (result.success) updateTree();
}

function handleToggleLock(node: IUI) {
  void runLayerCommand(node, node.locked ? ACTION_NAME.UNLOCK_SELECTED : ACTION_NAME.LOCK_SELECTED);
}

function handleToggleVisible(node: IUI) {
  void runLayerCommand(node, ACTION_NAME.TOGGLE_VISIBLE);
}

function handleMoveUp(node: IUI) {
  void runLayerCommand(node, ACTION_NAME.BRING_FORWARD);
}

function handleMoveDown(node: IUI) {
  void runLayerCommand(node, ACTION_NAME.SEND_BACKWARD);
}

function handleMoveTop(node: IUI) {
  void runLayerCommand(node, ACTION_NAME.BRING_TO_FRONT);
}

function handleMoveBottom(node: IUI) {
  void runLayerCommand(node, ACTION_NAME.SEND_TO_BACK);
}

// 监听 editor prop 变化
watch(
  () => props.editor,
  (newVal) => {
    if (newVal) {
      cleanups.forEach((fn) => fn());
      cleanups = [];

      initListeners();
      updateTree();
      updateSelection();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  cleanups.forEach((fn) => fn());
});

// Draggable & Collapsible Logic
const { position, isDragging, startDrag } = useDraggable({
  initialX: window.innerWidth - 260,
  initialY: 70,
  snapToViewport: true,
  snapThreshold: 16,
  panelWidth: 240,
  panelHeight: 560,
  margin: 8,
});
const { isCollapsed, toggleCollapse } = useCollapsible(true);
const { togglePanelDock } = usePanelDock();
const mode = usePanelMode("layer-panel");
</script>

<template>
  <div v-show="(props.open ?? true) && mode === 'float'"
    class="layer-panel card bg-base-100 shadow-xl border border-base-200 backdrop-blur-sm fixed overflow-hidden transition-[height,width] z-30"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: '15rem',
      height: isCollapsed ? 'auto' : '60vh',
      backgroundColor: 'rgb(var(--color-base-100) / 0.9)',
    }">
    <!-- Header / Drag Handle -->
    <div class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag">
      <div class="flex items-center gap-2">
        <!-- Layers Icon -->
        <Icon name="layer" class="w-4 h-4 opacity-70" />
        <span class="text-xs font-bold">图层</span>
        <span class="text-[10px] font-normal opacity-50 ml-1">({{ treeData.length }})</span>
      </div>

      <div class="flex items-center gap-0.5">
        <button class="btn btn-ghost btn-xs btn-square" title="收纳到右侧槽" @click.stop="togglePanelDock('layer-panel')"
          @mousedown.stop>
          <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" />
        </button>

        <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse(isDragging)" @mousedown.stop>
          <Icon :name="isCollapsed ? 'arrow-down' : 'arrow-up'" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto py-2" v-show="!isCollapsed">
      <div v-if="treeData.length === 0" class="text-center text-xs opacity-40 mt-10">没有图层</div>

      <LayerItem v-for="node in treeData.slice().reverse()" :key="node.innerId" :node="node" :depth="0"
        :selectedIds="selectedIds" :treeVersion="treeVersion" @select="handleSelect" @toggleLock="handleToggleLock"
        @toggleVisible="handleToggleVisible" @moveUp="handleMoveUp" @moveDown="handleMoveDown" @moveTop="handleMoveTop"
        @moveBottom="handleMoveBottom" />
    </div>
  </div>

  <PanelFlyoutWrapper v-if="mode === 'flyout'" panel-id="layer-panel" title="图层" icon="layer" :width="256">
    <div class="py-2" style="max-height: calc(100vh - 10rem)">
      <div class="px-3 py-1 text-[10px] opacity-50">({{ treeData.length }})</div>
      <div v-if="treeData.length === 0" class="text-center text-xs opacity-40 mt-10">没有图层</div>
      <LayerItem v-for="node in treeData.slice().reverse()" :key="node.innerId" :node="node" :depth="0"
        :selectedIds="selectedIds" :treeVersion="treeVersion" @select="handleSelect" @toggleLock="handleToggleLock"
        @toggleVisible="handleToggleVisible" @moveUp="handleMoveUp" @moveDown="handleMoveDown" @moveTop="handleMoveTop"
        @moveBottom="handleMoveBottom" />
    </div>
  </PanelFlyoutWrapper>
</template>
