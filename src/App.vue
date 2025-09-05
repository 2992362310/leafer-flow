<script setup lang="ts">
import { onMounted, useTemplateRef, ref } from 'vue'
import { initEditor, type Editor, doClear, doUndo, doRedo } from './editor'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorButton from './components/EditorButton.vue'
import EditorLog from './components/EditorLog.vue'
import StatusBar from './components/StatusBar.vue'
import type { IExcuteArg, IExcuteCommand } from './editor/types'
import { WatchEvent } from 'leafer'

const editorRef = useTemplateRef('editorRef')
const toolbarRef = useTemplateRef('toolbarRef')
const logRef = useTemplateRef('logRef')

let editor: Editor

// 元素计数
const elementCount = ref(0)

// 初始化 Leafer 应用
const initializeApp = () => {
  if (!editorRef.value) return false

  editor = initEditor(editorRef.value)

  // 监听元素变化以更新计数
  editor.app.tree.on(WatchEvent.DATA, () => {
    elementCount.value = editor.app.tree.children.length
  })

  logRef.value?.addLog({ message: '应用初始化完成', level: 'success' })
}

onMounted(() => {
  initializeApp()
})

function excuteCallback<T>(arg: T) {
  const { action, tool, next } = arg as IExcuteArg
  logRef.value?.addLog({ message: `${tool} ${action}`, command: tool, level: next ? 'error' : 'success' })
  toolbarRef.value?.changeTool(next ?? 'select')
}

function handleTool(evt: IExcuteCommand) {
  editor.execute(evt, excuteCallback)
  logRef.value?.addLog({ message: `开始执行工具: ${evt.command}`, level: 'info' })
}

function handleAction(action: string) {
  logRef.value?.addLog({ message: `执行操作: ${action}` })

  // 处理清空画布操作
  if (action === 'clearCanvas') {
    const result = doClear(editor)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'error'
    })
  }

  // 处理撤销操作
  if (action === 'undo') {
    const result = doUndo(editor)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning'
    })
  }

  // 处理重做操作
  if (action === 'redo') {
    const result = doRedo(editor)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning'
    })
  }
}
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>

  <div class="toolbar-wrap rounded-box !top-8 !left-1/2 -translate-x-1/2">
    <EditorToolbar @tool="handleTool" ref="toolbarRef" />
    <span class="divider divider-horizontal mx-1"></span>
    <EditorButton @action="handleAction" />
  </div>

  <!-- 状态栏 -->
  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar :selected-tool="toolbarRef?.selectedTool" :element-count="elementCount" />
  </div>

  <!-- 事件日志 -->
  <EditorLog class="absolute bottom-2 right-4" ref="logRef" />
</template>

<style scoped>
@reference "tailwindcss";

.toolbar-wrap {
  @apply absolute z-10 p-2 w-max ring-2 ring-blue-500/50 flex gap-2;
}
</style>
