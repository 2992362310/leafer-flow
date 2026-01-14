import { App, type IAppConfig } from 'leafer'
import type { IEditorPlugin, IEditorTool, IExecuteCommand, TCallback } from './types'

const INIT_CONFIG = {
  view: window,
  editor: {},
  tree: {},
}

export default class Editor {
  app: App
  plugins: IEditorPlugin[] = []
  tools = new Map()
  constructor(config: IAppConfig = INIT_CONFIG) {
    const app = new App(config)
    this.app = app
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
    if (tool) {
      tool.cancel(() => {
        callback({
          next: next,
          action: 'cancel execute',
          tool: pre,
        })

        this.executeTool(next, callback)
      })
    } else {
      this.executeTool(next, callback)
    }
  }

  private executeTool(command: string, callback: TCallback) {
    const { app, tools } = this
    const tool = tools.get(command)
    if (!tool) {
      app.editor.config.selector = true
      this.setCursorType('')
      return
    }

    app.editor.config.selector = false
    this.setCursorType(command === 'draw_text' ? 'text' : 'crosshair')

    tool.execute(() => {
      app.editor.config.selector = true
      this.setCursorType('')

      callback({
        next: null,
        action: 'success execute',
        tool: command,
      })
    })
  }

  private setCursorType(type: string) {
    const view = this.app.view as HTMLElement
    if (view) {
      view.style.cursor = type
    }
  }
}

