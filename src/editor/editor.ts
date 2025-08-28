import { App, type IAppConfig } from 'leafer'
import type { IEditorPlugin, IEditorTool, TCallback } from './types'

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
  execute<T>(command: string, callback: TCallback) {
    const { tools, app } = this
    const tool = tools.get(command)
    if (!tool) return

    app.editor.config.boxSelect = false
    tool.execute((arg: T) => {
      app.editor.config.boxSelect = true
      callback(arg)
    })
  }
}
