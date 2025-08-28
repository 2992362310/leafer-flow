import Editor from './editor'

// plugins
import { editorRuler } from './plugins/ruler'
import { editorSnap } from './plugins/snap'
import { editorDotMatrix } from './plugins/dot-matrix'

// tools
import { DrawRect } from './tools/draw-rect'
import { DrawArrow } from './tools/draw-arrow'

export function initEditor(view: HTMLElement) {
  const editor = new Editor({
    view: view,
    editor: {},
    tree: { type: 'design' },
  })

  editor.use(editorRuler)
  editor.use(editorSnap)
  editor.use(editorDotMatrix)

  editor.register('draw_rect', new DrawRect())
  editor.register('draw_arrow', new DrawArrow())

  return editor
}

export { Editor }
