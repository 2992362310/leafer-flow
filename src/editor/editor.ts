import { App, type IAppConfig } from 'leafer'
import type { IEditorPlugin, IEditorTool, IExcuteCommand, TCallback } from './types'
import { UndoRedoService } from './service/undo-redo'

const INIT_CONFIG = {
  view: window,
  editor: {},
  tree: {},
}

export default class Editor {
  app: App
  plugins: IEditorPlugin[] = []
  tools = new Map()
  undoRedo: UndoRedoService
  constructor(config: IAppConfig = INIT_CONFIG) {
    const app = new App(config)
    this.undoRedo = new UndoRedoService(app)
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
  execute(command: IExcuteCommand, callback: TCallback) {
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
      return
    }

    app.editor.config.selector = false
    tool.execute(() => {
      app.editor.config.selector = true

      callback({
        next: null,
        action: 'success execute',
        tool: command,
      })

      // 执行工具后保存
      this.undoRedo.save()
    })
  }
}
