<script setup lang="ts">
import { onMounted, useTemplateRef, ref } from 'vue'
import { initEditor, type Editor } from './editor'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorButton from './components/EditorButton.vue'
import EditorLog from './components/EditorLog.vue'
import StatusBar from './components/StatusBar.vue'

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
  editor.app.tree.on('add', () => {
    elementCount.value = editor.app.tree.children.length
  })

  editor.app.tree.on('remove', () => {
    elementCount.value = editor.app.tree.children.length
  })

  logRef.value?.addSuccessLog('应用初始化完成')
}

onMounted(() => {
  initializeApp()
})

function handleTool(tool: string) {
  editor.execute(tool, () => {
    toolbarRef.value?.changeTool('select')
    logRef.value?.addInfoLog(`执行 ${tool} 完成`)
  })
}

function handleAction(action: string) {
  console.log(action)
  logRef.value?.addInfoLog(`执行操作: ${action}`)
  // editor.execute(action)
}

</script>

<template>
  <section class="w-full h-full relative" ref="editorRef">
    <div
      class="absolute  z-10 !top-8 !left-1/2 -translate-x-1/2 w-max ring-2 ring-blue-500/50 rounded-box p-2 flex gap-2">
      <EditorToolbar @tool="handleTool" ref="toolbarRef" />
      <div class="divider divider-horizontal mx-1"></div>
      <EditorButton @action="handleAction" />
    </div>

    <!-- 状态栏 -->
    <div class="absolute bottom-2 left-8 z-10 w-fit">
      <StatusBar :selected-tool="toolbarRef?.selectedTool" :element-count="elementCount" />
    </div>

    <!-- 事件日志 -->
    <EditorLog ref="logRef" class="absolute bottom-2 right-4 z-10" />
  </section>
</template>
