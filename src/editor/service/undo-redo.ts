import type { App, IUIJSONData } from 'leafer'
import { DragEvent } from 'leafer'

import { History } from 'state-snapshot'
import { debounce } from 'lodash-es'

type IHistoryItem = IUIJSONData

/**
 * 撤销重做服务
 */
export class UndoRedoService {
  app: App
  his: History
  private isExecuting: boolean = false
  private listenerPaused: boolean = false
  constructor(app: App) {
    this.app = app
    this.his = new History()
    this.#listen()
  }

  #listen() {
    this.app.editor.on([
      DragEvent.END,
    ], this.#saveChange)
  }

  destroy() {
    this.app.editor.off([
      DragEvent.END,
    ], this.#saveChange)
  }

  #saveChange = () => {
    if (this.app.editor.innerEditing) {
      return
    }
    if (this.listenerPaused || this.isExecuting) {
      return
    }
    this.#snapshotState()
  }

  save(fun?: () => void) {
    if (this.listenerPaused) {
      return fun?.()
    }

    fun?.()

    if (this.isExecuting) {
      return
    }

    this.#snapshotState()
  }

  #snapshotState() {
    const run = debounce(() => {
      const state = this.#getCurrentState()
      this.his.pushSync(state)
    }, 100)

    return run()
  }

  #getCurrentState(): IHistoryItem {
    return this.app.tree.toJSON()
  }

  #applyState(historyItem: IHistoryItem) {
    this.app.tree.set(historyItem)
  }

  withoutListen<T>(fn: () => T): T {
    this.listenerPaused = true
    try {
      return fn()
    }
    finally {
      this.listenerPaused = false
    }
  }

  // 撤销
  undo() {
    if (this.his.hasUndo) {
      this.his.undo()
      this.#executeAction()
    }
  }

  // 重做
  redo() {
    if (this.his.hasRedo) {
      this.his.redo()
      this.#executeAction()
    }
  }

  #executeAction() {
    if (this.isExecuting)
      return

    this.isExecuting = true
    try {
      const historyItem = this.his.get()
      this.#applyState(historyItem)
    }
    finally {
      this.isExecuting = false
    }
  }

  canUndo() {
    return this.his.hasUndo
  }

  canRedo() {
    return this.his.hasRedo
  }

  clear() {
    this.his.reset()
  }
}
