import type { App } from 'leafer'
import { DotMatrix } from 'leafer-x-dot-matrix'
import type { IEditorPlugin } from '../types'

export const editorDotMatrix: IEditorPlugin = {
  init<DotMatrix>(app: App): DotMatrix {
    const dotMatrix = new DotMatrix(app)
    dotMatrix.enableDotMatrix(true)

    return dotMatrix as DotMatrix
  },
}
