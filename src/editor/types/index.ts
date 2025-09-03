import type { App, IUI } from 'leafer'
import Editor from '../editor'

export { type Editor }

export interface IEditorPlugin {
  init: <T>(app: App) => T
}

export interface IExcuteCommand {
  command: string
  pre: string
}

export interface IEditorTool {
  init: (app: Editor) => void
  execute: (callback: TCallback) => void
  cancel: (callback: TCallback) => void
}

export type TCallback = <T>(arg: T) => void

export interface IDrawOptions {
  stroke?: string
  fill?: string
  strokeWidth?: number
  cornerRadius?: number
  opacity?: number
}

export interface IDrawResult {
  action: string
  element: IUI | null
}

export interface IExcuteArg {
  next: string | null
  action: string
  tool: string
  data?: IDrawResult
}
