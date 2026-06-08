<script setup lang="ts">
import { ref, onUnmounted, shallowRef, watch, provide } from "vue";
import type { IUI } from "@leafer-ui/interface";
import type { Editor } from "../../editor";
import { ACTION_NAME } from "../../editor/constants";
import LayerItem from "./LayerItem.vue";
import { useDraggable, useCollapsible } from "../../composables/useDraggable";

const props = defineProps<{
  editor?: Editor;
}>();

const treeData = shallowRef<IUI[]>([]);
const selectedIds = ref<number[]>([]);
const treeVersion = ref(0);

// 提供给子组件的移动方法
provide("layerContext", {
  moveLayer,
});

function moveLayer(dragId: number, dropId: number, dropPosition: "top" | "bottom" | "inside") {
  if (!props.editor?.app) return;

  // 1. 获取所有节点 (leafer API findOne 是异步的吗？通常是同步的，但如果是大树要注意)
  // 我们可以直接用 id map 加速，但这里用 find 够了
  // 注意：findOne 可能会返回自身或者子节点，这逻辑是对的。

  // 使用 innerId 查找
  // 注意：Leafer 的 findOne 只能查找 group 的子元素，如果 target 本身就是顶层元素，可能需要特殊处理
  // 或者我们直接遍历 app.tree (根节点)

  // 递归查找 helper
  const findNode = (root: IUI, id: number): IUI | null => {
    if (root.innerId === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const res = findNode(child as IUI, id);
        if (res) return res;
      }
    }
    return null;
  };

  const dragNode = findNode(props.editor.app.tree as IUI, dragId);
  const dropNode = findNode(props.editor.app.tree as IUI, dropId);

  if (dragNode && dropNode && dragNode !== dropNode) {
    // Check cyclic
    let p = dropNode.parent;
    while (p) {
      if (p === dragNode) {
        return;
      }
      p = p.parent;
    }

    if (dropPosition === "top") {
      if (dropNode.parent) dropNode.parent.addAfter(dragNode, dropNode);
    } else if (dropPosition === "bottom") {
      if (dropNode.parent) dropNode.parent.addBefore(dragNode, dropNode);
    } else if (dropPosition === "inside") {
      dropNode.add(dragNode);
    }

    props.editor.history.save();
    updateTree();
  } else {
    console.warn("Nodes not found:", dragId, dropId);
  }
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
});
const { isCollapsed, toggleCollapse } = useCollapsible(true);
</script>

<template>
  <div
    class="layer-panel card bg-base-100 shadow-xl border border-base-200 backdrop-blur-sm fixed overflow-hidden transition-[height,width] z-30"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: '15rem',
      height: isCollapsed ? 'auto' : '60vh',
      backgroundColor: 'rgb(var(--color-base-100) / 0.9)',
    }"
  >
    <!-- Header / Drag Handle -->
    <div
      class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <!-- Layers Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-4 h-4 opacity-70"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        <span class="text-xs font-bold">图层</span>
        <span class="text-[10px] font-normal opacity-50 ml-1">({{ treeData.length }})</span>
      </div>

      <!-- Collapse Button -->
      <button
        class="btn btn-ghost btn-xs btn-square"
        @click.stop="toggleCollapse(isDragging)"
        @mousedown.stop
      >
        <svg
          v-if="!isCollapsed"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto py-2" v-show="!isCollapsed">
      <div v-if="treeData.length === 0" class="text-center text-xs opacity-40 mt-10">没有图层</div>

      <LayerItem
        v-for="node in treeData.slice().reverse()"
        :key="node.innerId"
        :node="node"
        :depth="0"
        :selectedIds="selectedIds"
        :treeVersion="treeVersion"
        @select="handleSelect"
        @toggleLock="handleToggleLock"
        @toggleVisible="handleToggleVisible"
        @moveUp="handleMoveUp"
        @moveDown="handleMoveDown"
        @moveTop="handleMoveTop"
        @moveBottom="handleMoveBottom"
      />
    </div>
  </div>
</template>
