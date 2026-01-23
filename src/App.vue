<script setup lang="ts">
import { onMounted, useTemplateRef, ref, shallowRef } from 'vue'
import {
  initEditor,
  type Editor,
  doClear,
  doUndo,
  doRedo,
  doDelete,
  doGroup,
  doUnGroup,
} from './editor'
import { useEditorShortcuts } from './editor/shortcuts'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorButton from './components/EditorButton.vue'
import EditorLog from './components/EditorLog.vue'
import EditorPanel from './components/EditorPanel.vue'
import LayerPanel from './components/LayerTree/LayerPanel.vue'
import StatusBar from './components/StatusBar.vue'
import type { IExecuteArg, IExecuteCommand } from './editor/types'
import { WatchEvent } from 'leafer'

const editorRef = useTemplateRef('editorRef')
const toolbarRef = useTemplateRef('toolbarRef')
const logRef = useTemplateRef('logRef')

const editor = shallowRef<Editor>()

// 快捷键 hook
const { syncCurrentTool } = useEditorShortcuts({
  onTool: handleTool,
  onAction: handleAction,
})

// 元素计数
const elementCount = ref(0)

// 初始化 Leafer 应用
const initializeApp = () => {
  if (!editorRef.value) return false

  editor.value = initEditor(editorRef.value)

  // 监听元素变化以更新计数
  editor.value.app.tree.on(WatchEvent.DATA, () => {
    elementCount.value = editor.value!.app.tree.children.length
  })

  logRef.value?.addLog({ message: '应用初始化完成', level: 'success' })
}

onMounted(() => {
  initializeApp()
})

function executeCallback<T>(arg: T) {
  const { action, tool, next } = arg as IExecuteArg
  logRef.value?.addLog({
    message: `${tool} ${action}`,
    command: tool,
    level: next ? 'error' : 'success',
  })

  const nextTool = next ?? 'select'
  toolbarRef.value?.changeTool(nextTool)

  // 同步快捷键内部状态
  syncCurrentTool(nextTool)
}

function handleTool(evt: IExecuteCommand) {
  if (!editor.value) return

  // 同步工具条状态
  toolbarRef.value?.changeTool(evt.command)

  // 同步 shortcuts 模块内部状态
  syncCurrentTool(evt.command)

  editor.value.execute(evt, executeCallback)
  logRef.value?.addLog({ message: `开始执行工具: ${evt.command}`, level: 'info' })
}

function handleAction(action: string) {
  if (!editor.value) return
  logRef.value?.addLog({ message: `执行操作: ${action}` })

  // 处理清空画布操作
  if (action === 'clearCanvas') {
    const result = doClear(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'error',
    })
  }

  // 处理撤销操作
  if (action === 'undo') {
    const result = doUndo(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning',
    })
  }

  // 处理重做操作
  if (action === 'redo') {
    const result = doRedo(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning',
    })
  }

  // 处理删除操作
  if (action === 'delete') {
    const result = doDelete(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning',
    })
  }

  // 处理组合操作
  if (action === 'group') {
    const result = doGroup(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning',
    })
  }

  // 处理取消组合操作
  if (action === 'ungroup') {
    const result = doUnGroup(editor.value)
    logRef.value?.addLog({
      message: result.message,
      level: result.success ? 'success' : 'warning',
    })
  }
}
</script>

<template>
  <section class="w-full h-full" ref="editorRef"></section>

  <div
    class="absolute z-10 px-2 py-1.5 w-max flex gap-1 bg-base-100/90 backdrop-blur shadow-lg border border-base-200 rounded-xl !top-12 !left-1/2 -translate-x-1/2"
  >
    <EditorToolbar @tool="handleTool" ref="toolbarRef" />
    <span class="divider divider-horizontal mx-0 my-1"></span>
    <EditorButton @action="handleAction" />
  </div>

  <!-- 图层面板 (浮动) -->
  <LayerPanel :editor="editor" />

  <!-- 属性面板 (浮动) -->
  <EditorPanel :editor="editor" class="z-10" />

  <!-- 状态栏 -->
  <div class="absolute bottom-2 left-8 w-fit">
    <StatusBar :selected-tool="toolbarRef?.selectedTool" :element-count="elementCount" />
  </div>

  <!-- 事件日志 -->
  <EditorLog class="absolute bottom-2 right-4" ref="logRef" />
</template>
