<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import Icon from '../Icon.vue'
import type { IUI } from '@leafer-ui/interface'

// 定义 Props
const props = defineProps<{
  node: IUI // Leafer UI Element
  depth: number
  selectedIds: number[]
  treeVersion: number // 添加版本号以强制刷新
}>()

interface LayerContext {
    moveLayer: (dragId: number, dropId: number, dropPosition: 'top' | 'bottom' | 'inside') => void
}

const { moveLayer } = inject('layerContext') as LayerContext

// 折叠状态
const isExpanded = ref(true)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// 计算子节点列表 (依赖 treeVersion，确保每次更新都重新获取)
const childrenList = computed(() => {
    // 显式依赖 version
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = props.treeVersion
    if (isGroup.value && props.node.children) {
        return [...props.node.children].reverse()
    }
    return []
})

// 拖拽状态
const isDragOver = ref(false)
const dropPosition = ref<'top' | 'bottom' | 'inside' | null>(null)

function handleDragStart(e: DragEvent) {
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(props.node.innerId))
        // 设置拖拽图像为透明或自定义，这里默认
    }
}

function handleDragOver(e: DragEvent) {
    e.preventDefault() // 允许 Drop
    if (!e.dataTransfer) return
    e.dataTransfer.dropEffect = 'move'
    
    // 计算 Drop 位置
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    // 逻辑：
    // 如果是 Group，中间 50% 区域认为是 "inside"
    // 上下 25% 认为是 insert before/after
    
    const threshold = isGroup.value ? 0.25 : 0.5
    
    if (y < height * threshold) {
        dropPosition.value = 'top'
    } else if (y > height * (1 - threshold)) {
        dropPosition.value = 'bottom'
    } else {
        dropPosition.value = isGroup.value ? 'inside' : 'bottom' // 非 Group 中间也算 bottom 吧，或者保持 split
        // 其实非 Group 只要 top/bottom split 就行
        if (!isGroup.value) {
            dropPosition.value = y < height * 0.5 ? 'top' : 'bottom'
        }
    }
    
    isDragOver.value = true
}

function handleDragLeave() {
    isDragOver.value = false
    dropPosition.value = null
}

function handleDrop(e: DragEvent) {
    e.preventDefault()
    isDragOver.value = false
    const sourceId = Number(e.dataTransfer?.getData('text/plain'))
    
    if (sourceId && sourceId !== props.node.innerId && dropPosition.value) {
        moveLayer(sourceId, props.node.innerId, dropPosition.value)
    }
    dropPosition.value = null
}

// 定义事件
const emit = defineEmits<{
  (e: 'select', node: IUI): void
  (e: 'toggleLock', node: IUI): void
  (e: 'toggleVisible', node: IUI): void
}>()

// 判断节点类型
const isGroup = computed(() => {
    return props.node && props.node.isBranch
    // 或者 props.node instanceof Group
})

const isSelected = computed(() => {
  return props.selectedIds.includes(props.node.innerId)
})

// 图标映射
const iconName = computed(() => {
  if (isGroup.value) return 'group'
  if (props.node.tag === 'Text') return 'draw_text'
  if (props.node.tag === 'Rect') return 'draw_rect'
  if (props.node.tag === 'Ellipse') return 'draw_circle' // Leafer Circle 其实是 Ellipse 或 EllipseData
  if (props.node.tag === 'Polygon') return 'draw_diamond'
  if (props.node.tag === 'Line') return 'draw_arrow' // 简单映射
  return 'layer'
})

// 状态图表
const lockIcon = computed(() => props.node.locked ? 'lock' : 'unlock')
const visibleIcon = computed(() => props.node.visible ? 'visible' : 'hidden')

// 交互处理
function handleSelect() {
  emit('select', props.node)
}

function handleToggleLock(e: Event) {
  e.stopPropagation()
  emit('toggleLock', props.node)
}

function handleToggleVisible(e: Event) {
  e.stopPropagation()
  emit('toggleVisible', props.node)
}

// 递归事件冒泡
function onChildSelect(node: IUI) {
  emit('select', node)
}
function onChildToggleLock(node: IUI) {
  emit('toggleLock', node)
}
function onChildToggleVisible(node: IUI) {
  emit('toggleVisible', node)
}
</script>

<template>
  <div class="flex flex-col select-none">
    <!-- 当前行 -->
    <div 
      class="flex items-center h-8 hover:bg-base-200 cursor-pointer pr-2 group relative border-y-2 border-transparent"
      :class="{ 
          'bg-primary/10 text-primary': isSelected,
          '!border-t-primary/50': isDragOver && dropPosition === 'top',
          '!border-b-primary/50': isDragOver && dropPosition === 'bottom',
          'bg-primary/5 ring-1 ring-inset ring-primary/50': isDragOver && dropPosition === 'inside'
      }"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleSelect"
      draggable="true"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- 展开/折叠箭头 -->
      <span 
        class="w-4 h-4 flex items-center justify-center opacity-50 hover:bg-base-300 rounded mr-0.5 transition-colors"
        @click.stop="toggleExpand"
      >
        <Icon 
            v-if="isGroup && node.children && node.children.length" 
            name="arrow-down" 
            class="w-3 h-3 transition-transform duration-200" 
            :class="{ '-rotate-90': !isExpanded }"  
        />
      </span>

      <!-- 类型图标 -->
      <Icon :name="iconName" class="w-4 h-4 mx-1 opacity-70" />

      <!-- 节点名称 -->
      <span class="flex-1 truncate text-xs">
        {{ node.name || node.tag || 'Unknown' }} 
        <span class="opacity-40 ml-1 text-[10px]" v-if="isGroup">({{ node.children?.length || 0 }})</span>
      </span>

      <!-- 状态按钮 (hover 显示或是 locked/hidden 状态一直显示) -->
      <div class="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity"
           :class="{ '!opacity-100': node.locked || !node.visible }">
        
        <button @click="handleToggleLock" class="p-0.5 hover:bg-base-300 rounded">
           <Icon :name="lockIcon" class="w-3 h-3" :class="{'text-warning': node.locked}" />
        </button>
        
        <button @click="handleToggleVisible" class="p-0.5 hover:bg-base-300 rounded">
           <Icon :name="visibleIcon" class="w-3 h-3" :class="{'text-base-content/30': !node.visible}" />
        </button>
      </div>
    </div>

    <!-- 子节点递归 (倒序渲染，因为图层面板上方通常是 Z-index 高的，即数组末尾) -->
    <div v-if="isGroup" v-show="isExpanded">
      <LayerItem 
        v-for="child in childrenList" 
        :key="child.innerId"
        :node="child"
        :depth="depth + 1"
        :selectedIds="selectedIds"
        :treeVersion="treeVersion"
        @select="onChildSelect"
        @toggleLock="onChildToggleLock"
        @toggleVisible="onChildToggleVisible"
      />
    </div>
  </div>
</template>
