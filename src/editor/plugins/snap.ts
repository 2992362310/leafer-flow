import type { App } from 'leafer'
import { Snap } from 'leafer-x-easy-snap'
import type { IEditorPlugin } from '../types'

export const editorSnap: IEditorPlugin = {
  init<Snap>(app: App): Snap {
    const snap = new Snap(app)
    snap.enable(true)

    return snap as Snap
  },
}
