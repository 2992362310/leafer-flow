<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { type IUI, Text } from 'leafer'
import { EditorEvent } from 'leafer-editor'
import type { Editor } from '../editor'

const props = defineProps<{
  editor: Editor | undefined
}>()

const selectedElement = ref<IUI | null>(null)
const selectedChildShape = ref<IUI | null>(null)
const selectedChildText = ref<Text | null>(null)

// Properties state
const x = ref(0)
const y = ref(0)
const width = ref(0)
const height = ref(0)
const fill = ref('#000000')
const stroke = ref('#000000')
const strokeWidth = ref(1)
const opacity = ref(1)
const textContent = ref('')
const fontSize = ref(12)

const updateState = () => {
  if (!selectedElement.value) return
  const el = selectedElement.value
  x.value = Math.round(el.x || 0)
  y.value = Math.round(el.y || 0)
  width.value = Math.round(el.width || 0)
  height.value = Math.round(el.height || 0)
  
  if (selectedChildShape.value) {
    const shape = selectedChildShape.value
    // Handle fill which can be a color string or object. Simple case: string
    if (typeof shape.fill === 'string') fill.value = shape.fill
    if (typeof shape.stroke === 'string') stroke.value = shape.stroke
    
    // safe handle strokeWidth
    const sw = shape.strokeWidth
    strokeWidth.value = typeof sw === 'number' ? sw : 1

    opacity.value = shape.opacity || 1
  }

  if (selectedChildText.value) {
    const t = selectedChildText.value
    // safe handle text
    const txt = t.text
    textContent.value = (typeof txt === 'string' || typeof txt === 'number') ? String(txt) : ''
    
    fontSize.value = t.fontSize || 12
  }
}

const onSelect = (e: EditorEvent) => {
  const list = e.editor.list
  if (list && list.length > 0) {
    const el = list[0] as IUI
    selectedElement.value = el
    
    // Check for our composite components (Group -> [Shape, Text])
    // Using tag property for safer identification
    if (el.tag === 'Group' && el.children && el.children.length >= 1) {
        // Assume first child is the main shape
        selectedChildShape.value = el.children[0] as IUI
        
        // Check if second child is Text
        const secondChild = el.children[1]
        if (el.children.length > 1 && secondChild && secondChild.tag === 'Text') {
            selectedChildText.value = secondChild as Text
        } else {
            selectedChildText.value = null
        }
    } else {
        // It's a single element (Text, Rect, Connector, etc)
        selectedChildShape.value = el
        
        if (el.tag === 'Text') {
            selectedChildText.value = el as Text
        } else {
            selectedChildText.value = null
        }
    }

    updateState()
  } else {
    selectedElement.value = null
    selectedChildShape.value = null
    selectedChildText.value = null
  }
}

watch(() => props.editor, (newEditor) => {
  if (newEditor && newEditor.app) {
    newEditor.app.editor.on(EditorEvent.SELECT, onSelect)
  }
}, { immediate: true })

onUnmounted(() => {
  if (props.editor && props.editor.app) {
    props.editor.app.editor.off(EditorEvent.SELECT, onSelect)
  }
})

// Updaters
// Helper for saving history
const saveHistory = () => {
    if (props.editor) {
        props.editor.history.save()
    }
}

const updateFill = (v: string) => {
    fill.value = v
    if (selectedChildShape.value) {
        selectedChildShape.value.fill = v
        saveHistory()
    }
}
const updateStroke = (v: string) => {
    stroke.value = v
    if (selectedChildShape.value) {
        selectedChildShape.value.stroke = v
        saveHistory()
    }
}
const updateStrokeWidth = (v: number) => {
    strokeWidth.value = v
    if (selectedChildShape.value) {
        selectedChildShape.value.strokeWidth = v
        saveHistory()
    }
}
const updateOpacity = (v: number) => {
    opacity.value = v
    if (selectedChildShape.value) {
        selectedChildShape.value.opacity = v
        saveHistory()
    }
}
const updateText = (v: string) => {
    textContent.value = v
    if (selectedChildText.value) {
        selectedChildText.value.text = v
        saveHistory()
    }
}
const updateFontSize = (v: number) => {
    fontSize.value = v
    if (selectedChildText.value) {
        selectedChildText.value.fontSize = v
        saveHistory()
    }
}
// Coordinate updates need to move the group, usually via method to handle children?
// But changing x/y of the group directly is fine for leafer.
const updateX = (v: number) => { 
    x.value = v; 
    if (selectedElement.value) {
        selectedElement.value.x = v 
        saveHistory()
    }
}
const updateY = (v: number) => { 
    y.value = v; 
    if (selectedElement.value) { 
        selectedElement.value.y = v 
        saveHistory()
    }
}
// Width/Height might be complex for Group if we want to resize. 
// For now, simpler to just start with basic props.

// Draggable & Collapsible Logic
const isCollapsed = ref(false)
const position = ref({ x: 60, y: 70 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const toggleCollapse = () => {
    if (isDragging.value) return // Prevent toggle when dragging ends
    isCollapsed.value = !isCollapsed.value
}

const startDrag = (event: MouseEvent) => {
    isDragging.value = true
    dragOffset.value = {
        x: event.clientX - position.value.x,
        y: event.clientY - position.value.y
    }
    
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    event.preventDefault() // 防止选中文本
}

const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return
    position.value = {
        x: event.clientX - dragOffset.value.x,
        y: event.clientY - dragOffset.value.y
    }
}

const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
}
</script>

<template>
  <Transition name="slide-fade">
    <div 
        class="card bg-base-100 shadow-xl border border-base-200 backdrop-blur-sm bg-base-100/90 fixed overflow-hidden transition-[height]"
        :style="{ left: position.x + 'px', top: position.y + 'px', width: '15rem' }"
        v-if="selectedElement"
    >
        <!-- Header / Drag Handle -->
        <div 
            class="flex justify-between items-center p-2 bg-base-200/50 cursor-move select-none"
            @mousedown="startDrag"
        >
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 opacity-70"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="19" cy="19" r="1"/></svg>
                <span class="text-xs font-bold">样式</span>
            </div>
            
             <!-- Collapse Button -->
            <button class="btn btn-ghost btn-xs btn-square" @click.stop="toggleCollapse" @mousedown.stop>
                <svg v-if="!isCollapsed" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
        </div>

      <div class="card-body p-4 pt-2" v-show="!isCollapsed">
        
        <!-- Position -->
        <div class="grid grid-cols-2 gap-2 mb-2">
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">X</span></div>
            <input type="number" :value="x" @input="e => updateX(Number((e.target as HTMLInputElement).value))" class="input input-bordered input-xs w-full" />
          </label>
          <label class="form-control w-full">
            <div class="label p-1"><span class="label-text text-xs">Y</span></div>
            <input type="number" :value="y" @input="e => updateY(Number((e.target as HTMLInputElement).value))" class="input input-bordered input-xs w-full" />
          </label>
        </div>

        <!-- Colors -->
        <div class="form-control w-full" v-if="selectedChildShape">
          <div class="label p-1"><span class="label-text text-xs">填充颜色</span></div>
          <div class="flex gap-2">
              <input type="color" :value="fill" @input="e => updateFill((e.target as HTMLInputElement).value)" class="h-6 w-8 cursor-pointer" />
              <span class="text-xs self-center">{{ fill }}</span>
          </div>
        </div>

        <div class="form-control w-full" v-if="selectedChildShape">
          <div class="label p-1"><span class="label-text text-xs">描边颜色</span></div>
          <div class="flex gap-2">
              <input type="color" :value="stroke" @input="e => updateStroke((e.target as HTMLInputElement).value)" class="h-6 w-8 cursor-pointer" />
              <span class="text-xs self-center">{{ stroke }}</span>
          </div>
        </div>

        <!-- Sliders -->
        <div class="form-control w-full" v-if="selectedChildShape">
          <div class="label p-1">
              <span class="label-text text-xs">描边宽度</span>
              <span class="label-text-alt text-xs">{{ strokeWidth }}</span>
          </div>
          <input type="range" min="0" max="20" step="1" :value="strokeWidth" @input="e => updateStrokeWidth(Number((e.target as HTMLInputElement).value))" class="range range-xs" />
        </div>

        <div class="form-control w-full" v-if="selectedChildShape">
          <div class="label p-1">
              <span class="label-text text-xs">不透明度</span>
              <span class="label-text-alt text-xs">{{ opacity }}</span>
          </div>
          <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="e => updateOpacity(Number((e.target as HTMLInputElement).value))" class="range range-xs" />
        </div>

        <!-- Text Props -->
        <div v-if="selectedChildText" class="divider my-2">文本</div>
        
        <div class="form-control w-full" v-if="selectedChildText">
          <div class="label p-1"><span class="label-text text-xs">内容</span></div>
          <input type="text" :value="textContent" @input="e => updateText((e.target as HTMLInputElement).value)" class="input input-bordered input-xs w-full" />
        </div>

        <div class="form-control w-full" v-if="selectedChildText">
          <div class="label p-1">
              <span class="label-text text-xs">字号</span>
              <span class="label-text-alt text-xs">{{ fontSize }}</span>
          </div>
          <input type="range" min="8" max="72" step="1" :value="fontSize" @input="e => updateFontSize(Number((e.target as HTMLInputElement).value))" class="range range-xs" />
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
