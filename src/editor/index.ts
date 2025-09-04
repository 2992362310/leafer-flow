import Editor from './editor'

// plugins
import { editorRuler } from './plugins/ruler'
import { editorSnap } from './plugins/snap'
import { editorDotMatrix } from './plugins/dot-matrix'

// tools
import { DrawRect } from './tools/draw-rect'
import { DrawArrow } from './tools/draw-arrow'
import { DrawCircle } from './tools/draw-circle'
import { DrawDiamond } from './tools/draw-diamond'
import { DrawText } from './tools/draw-text'

// actions
import { doClear } from './action/do-clear'
import { doUndo } from './action/do-undo'
import { doRedo } from './action/do-redo'

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
  editor.register('draw_circle', new DrawCircle())
  editor.register('draw_diamond', new DrawDiamond())
  editor.register('draw_text', new DrawText())

  return editor
}

export { Editor, doClear, doUndo, doRedo }