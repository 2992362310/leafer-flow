import type { App } from 'leafer'
import { Ruler } from 'leafer-x-ruler'
import type { IEditorPlugin } from '../types'

export const editorRuler: IEditorPlugin = {
  init<Ruler>(app: App): Ruler {
    const ruler = new Ruler(app)
    ruler.enabled = true

    return ruler as Ruler
  },
}
