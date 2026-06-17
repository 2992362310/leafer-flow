<script setup lang="ts">
import { ref, watch } from "vue";
import type { Editor } from "@/editor/editor";
import { useLayerManager, type Layer } from "./layer-manager";
import { useDraggable, useCollapsible } from "@/composables/useDraggable";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

// UI 状态
const { position, isDragging, startDrag } = useDraggable({
  initialX: window.innerWidth - 220,
  initialY: 300,
});
const { isCollapsed, toggleCollapse } = useCollapsible(true);

// 图层管理
const layerManager = useLayerManager(props.editor.app);

// 编辑状态
const editingLayerId = ref<string | null>(null);
const editingName = ref("");

// 添加图层
function handleAddLayer() {
  layerManager.addLayer();
}

// 删除图层
function handleRemoveLayer(id: string) {
  layerManager.removeLayer(id);
}

// 开始编辑名称
function startEditName(layer: Layer) {
  editingLayerId.value = layer.id;
  editingName.value = layer.name;
}

// 保存名称
function saveName() {
  if (editingLayerId.value && editingName.value.trim()) {
    layerManager.renameLayer(editingLayerId.value, editingName.value.trim());
  }
  editingLayerId.value = null;
  editingName.value = "";
}

// 切换可见性
function handleToggleVisibility(id: string) {
  layerManager.toggleVisibility(id);
}

// 切换锁定
function handleToggleLock(id: string) {
  layerManager.toggleLock(id);
}

// 设置透明度
function handleSetOpacity(id: string, opacity: number) {
  layerManager.setOpacity(id, opacity);
}

// 切换活动图层
function handleSetActive(id: string) {
  layerManager.setActiveLayer(id);
}

// 移动图层
function handleMoveLayer(id: string, direction: "up" | "down") {
  layerManager.moveLayer(id, direction);
}
</script>

<template>
  <div
    class="card shadow-lg border border-base-200 bg-base-100/95 backdrop-blur-sm fixed overflow-hidden z-10"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: '12rem',
      height: isCollapsed ? 'auto' : '40vh',
    }"
  >
    <!-- 标题栏 -->
    <div
      class="flex items-center justify-between px-2 py-1 bg-base-200/50 cursor-move select-none border-b border-base-200"
      @mousedown="startDrag"
    >
      <span class="text-[10px] font-medium">图层</span>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0"
          title="添加图层"
          @click.stop="handleAddLayer"
        >
          <span class="text-[10px]">+</span>
        </button>
        <button
          class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0"
          @click.stop="toggleCollapse(isDragging)"
        >
          <span class="text-[10px]">{{ isCollapsed ? "□" : "−" }}</span>
        </button>
      </div>
    </div>

    <!-- 图层列表 -->
    <div v-if="!isCollapsed" class="flex-1 overflow-y-auto p-1">
      <div
        v-for="layer in layerManager.layers.value"
        :key="layer.id"
        class="flex items-center gap-1 p-1 rounded hover:bg-base-200 cursor-pointer"
        :class="{
          'bg-primary/10': layer.id === layerManager.activeLayerId.value,
        }"
        @click="handleSetActive(layer.id)"
      >
        <!-- 可见性 -->
        <button
          class="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
          :title="layer.visible ? '隐藏' : '显示'"
          @click.stop="handleToggleVisibility(layer.id)"
        >
          <span class="text-[10px]">{{ layer.visible ? "👁" : "−" }}</span>
        </button>

        <!-- 锁定 -->
        <button
          class="btn btn-ghost btn-xs btn-square h-5 w-5 min-h-0"
          :title="layer.locked ? '解锁' : '锁定'"
          @click.stop="handleToggleLock(layer.id)"
        >
          <span class="text-[10px]">{{ layer.locked ? "🔒" : "−" }}</span>
        </button>

        <!-- 名称 -->
        <div class="flex-1 min-w-0">
          <input
            v-if="editingLayerId === layer.id"
            v-model="editingName"
            class="input input-xs w-full h-5 min-h-0"
            @blur="saveName"
            @keydown.enter="saveName"
            @keydown.escape="editingLayerId = null"
          />
          <span
            v-else
            class="text-[10px] truncate block"
            :class="{ 'line-through opacity-50': !layer.visible }"
            @dblclick="startEditName(layer)"
          >
            {{ layer.name }}
          </span>
        </div>

        <!-- 操作 -->
        <div class="flex gap-0.5">
          <button
            class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0"
            title="上移"
            @click.stop="handleMoveLayer(layer.id, 'up')"
          >
            <span class="text-[8px]">↑</span>
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0"
            title="下移"
            @click.stop="handleMoveLayer(layer.id, 'down')"
          >
            <span class="text-[8px]">↓</span>
          </button>
          <button
            v-if="layerManager.layers.value.length > 1"
            class="btn btn-ghost btn-xs btn-square h-4 w-4 min-h-0 text-error"
            title="删除"
            @click.stop="handleRemoveLayer(layer.id)"
          >
            <span class="text-[8px]">×</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
