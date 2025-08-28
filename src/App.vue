<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { initEditor, type Editor } from './editor'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorButton from './components/EditorButton.vue'
import EditorLog from './components/EditorLog.vue'
// import StatusBar from './components/StatusBar.vue'

const editorRef = useTemplateRef('editorRef')
const toolbarRef = useTemplateRef('toolbarRef')

let editor: Editor

// 初始化 Leafer 应用
const initializeApp = () => {
  if (!editorRef.value) return false

  editor = initEditor(editorRef.value)

  // addEventLog('应用初始化完成')
}

onMounted(() => {
  initializeApp()
})

function handleTool(tool: string) {
  editor.execute(tool, () => {
    toolbarRef.value?.changeTool('select')
    // addEventLog('执行完成')
  })
}

function handleAction(action: string) {
  console.log(action)
  // editor.execute(action)
}
</script>

<template>
  <section class="w-full h-full relative" ref="editorRef">
    <div class="absolute !top-8 !left-1/2 -translate-x-1/2 border rounded-box p-2 flex gap-2">
      <EditorToolbar @tool="handleTool" ref="toolbarRef" />
      <div class="divider divider-horizontal mx-1"></div>
      <EditorButton @action="handleAction" />
    </div>

    <!-- 状态栏 -->
    <div class="absolute bottom-4 left-4 z-10">
      <div class="badge badge-neutral mb-2">当前工具: {{ toolbarRef?.selectedTool || '无' }}</div>

      <!-- <StatusBar /> -->

      <!-- 事件日志 -->
      <EditorLog />
    </div>
  </section>
</template>
