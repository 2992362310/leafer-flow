import { onMounted, onUnmounted } from 'vue'
import type { IExecuteCommand } from './types'

type ToolHandler = (cmd: IExecuteCommand) => void
type ActionHandler = (action: string) => void

interface ShortcutOptions {
  onTool: ToolHandler
  onAction: ActionHandler
}

export function useEditorShortcuts(options: ShortcutOptions) {
  const { onTool, onAction } = options

  // 当前激活的工具（简单记录，用于判断）
  let currentTool = 'select'

  const handleKeydown = (e: KeyboardEvent) => {
    // 1. 忽略输入框内的按键
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const key = e.key.toLowerCase()
    const { ctrlKey, metaKey, shiftKey } = e
    // Mac use Meta (Command), Windows use Ctrl
    const isCmd = ctrlKey || metaKey

    // 2. 组合键操作 (Ctrl/Cmd + Key)
    if (isCmd) {
      // Undo
      if (key === 'z' && !shiftKey) {
        e.preventDefault()
        onAction('undo')
        return
      }
      // Redo
      if (key === 'z' && shiftKey) {
        e.preventDefault()
        onAction('redo')
        return
      }

      // Group
      if (key === 'g' && !shiftKey) {
        e.preventDefault()
        onAction('group')
        return
      }

      // Ungroup
      if (key === 'g' && shiftKey) {
        e.preventDefault()
        onAction('ungroup')
        return
      }

      return // 其他组合键直接返回，避免触发单键工具
    }

    // 3. 单键操作 (无修饰键)
    if (!isCmd && !shiftKey) {
      switch (key) {
        case 'v':
        case 'escape':
          switchTool('select')
          break
        case 'r':
          switchTool('draw_rect')
          break
        case 'd':
          switchTool('draw_diamond')
          break
        case 'o':
        case 'c':
          switchTool('draw_circle')
          break
        case 'a':
        case 'l':
          switchTool('draw_arrow')
          break
        case 'p':
          switchTool('draw_freehand')
          break
        case 't':
          switchTool('draw_text')
          break
        case 'delete':
        case 'backspace':
          onAction('delete')
          break
      }
    }
  }

  const switchTool = (nextTool: string) => {
    if (currentTool === nextTool) return

    onTool({
      command: nextTool,
      pre: currentTool,
    })
    currentTool = nextTool
  }

  // 外部更新当前工具状态（用于同步 UI 点击）
  const syncCurrentTool = (tool: string) => {
    currentTool = tool
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    syncCurrentTool,
  }
}
