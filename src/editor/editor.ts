import { App, type IAppConfig } from 'leafer'
import type { IEditorPlugin, IEditorTool, IExcuteCommand, TCallback } from './types'
import { camelToSnake } from './utils'

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
    this.app = new App(config)
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
          tool: camelToSnake(tool.constructor.name),
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
    if (!tool) return

    app.editor.config.boxSelect = false
    tool.execute(() => {
      app.editor.config.boxSelect = true

      callback({
        next: null,
        action: 'success execute',
        tool: camelToSnake(tool.constructor.name),
      })
    })
  }
}

