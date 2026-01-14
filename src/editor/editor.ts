import { App, type IAppConfig } from 'leafer'
import { EditorEvent } from 'leafer-editor'
import type { IEditorPlugin, IEditorTool, IExecuteCommand, TCallback } from './types'
import { HistoryManager } from './core/history'

const INIT_CONFIG = {
  view: window,
  editor: {},
  tree: {},
}

export default class Editor {
  app: App
  plugins: IEditorPlugin[] = []
  tools = new Map<string, IEditorTool>()
  private currentCursorClass: string = ''
  
  public history: HistoryManager

  constructor(config: IAppConfig = INIT_CONFIG) {
    const app = new App(config)
    this.app = app
    this.history = new HistoryManager(app)
    
    // 延后初始化监听，确保 editor 属性已就绪
    setTimeout(() => {
        this.initHistoryListeners()
    }, 0)
  }
  
  private initHistoryListeners() {
      // 使用字符串字面量避免 import 问题
      // 监听由编辑器产生的变换操作 (拖拽移动、缩放、旋转结束)
      if (!this.app.editor) return

      this.app.editor.on('move.end', () => this.history.save())
      this.app.editor.on('resize.end', () => this.history.save())
      this.app.editor.on('rotate.end', () => this.history.save())
  }

  use<T>(plugin: IEditorPlugin): T {
    const app = this.app
    const uPlugin = plugin.init(app)
    this.plugins.push(plugin)
    return uPlugin as T
  }

  register(name: string, tool: IEditorTool) {
    tool.init(this)
    this.tools.set(name, tool)
    return tool
  }

  execute(command: IExecuteCommand, callback: TCallback) {
    const { tools } = this
    const { pre, command: next } = command
    const tool = tools.get(pre)

    // 1. 如果有前置工具在运行，先取消它
    if (tool) {
      tool.cancel(() => {
        callback({
          next: next, // 告知上层我们要切换到 next
          action: 'cancel execute',
          tool: pre,
        })
        // 链式执行下一步
        this.runTool(next, callback)
      })
    } else {
      // 2. 直接执行新工具
      this.runTool(next, callback)
    }
  }

  private runTool(name: string, callback: TCallback) {
    const { app, tools } = this
    const tool = tools.get(name)

    // 清除之前的强制光标样式
    this.clearCursor()

    // 情况 A: 切换回选择模式 (Select) 或未知工具
    if (!tool) {
      app.editor.config.selector = true
      return
    }

    // 情况 B: 激活绘图工具
    // 1. 禁用原生的选择器，防止干扰
    app.editor.config.selector = false
    
    // 2. 设置对应的强制光标
    const cursorType = name === 'draw_text' ? 'cursor-text-force' : 'cursor-crosshair-force'
    this.setCursor(cursorType)

    // 3. 执行工具逻辑
    tool.execute(() => {
      // 工具执行完毕后的回调 (例如画完了一个矩形)
      
      // 保存历史记录
      this.history.save()
      
      // 恢复选择器
      app.editor.config.selector = true
      // 清除强制光标
      this.clearCursor()

      callback({
        next: null, // null 表示回到了默认状态 (Select)
        action: 'success execute',
        tool: name,
      })
    })
  }

  private setCursor(className: string) {
    const container = this.app.view as HTMLElement
    if (container) {
      container.classList.add(className)
      this.currentCursorClass = className
    }
  }

  private clearCursor() {
    const container = this.app.view as HTMLElement
    if (container && this.currentCursorClass) {
      container.classList.remove(this.currentCursorClass)
    }
    this.currentCursorClass = ''
    // 强制移除所有可能的光标类，确保干净
    if (container) {
        container.classList.remove('cursor-crosshair-force', 'cursor-text-force', 'cursor-grab-force')
    }
  }
}

