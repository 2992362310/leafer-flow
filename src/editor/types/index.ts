import type { App } from 'leafer'
import Editor from '../editor'

export { type Editor }

export interface IEditorPlugin {
  init: <T>(app: App) => T
}

export interface IEditorTool {
  init: (app: Editor) => void
  execute: (callback: TCallback) => void
  cancel: () => void
}

export type TCallback = <T>(arg: T) => void
