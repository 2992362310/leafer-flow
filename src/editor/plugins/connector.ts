import { type App } from 'leafer'
import type { IEditorPlugin } from '../types'
import Connector from './connector/leaferjs-x-connector'

export const editorConnector: IEditorPlugin = {
  init: <Connector>(app: App): Connector => {
    return new Connector(app) as Connector
  }
}
