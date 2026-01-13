import { PointerEvent, type IPointData, type IUI } from 'leafer'
import type { Editor, TCallback, IDrawResult } from '../types'

export abstract class DrawBase {
  protected editor: Editor | null = null
  protected element: IUI | null = null
  protected points: IPointData[] = []
  protected isDrawing = false
  protected callback?: TCallback

  init(editor: Editor) {
    this.editor = editor
  }

  execute(callback: TCallback) {
    this.callback = callback
    this.bindEvents()
  }

  cancel(callback: TCallback) {
    callback({})
    this.unBindEvents()
    this.callback = undefined
  }

  protected bindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    app.on(PointerEvent.DOWN, this.onDownBound)
    app.on(PointerEvent.MOVE, this.onMoveBound)
    app.on(PointerEvent.UP, this.onUpBound)
  }

  protected unBindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    // 结束绘制
    this.isDrawing = false
    this.element = null
    this.points = []

    app.off(PointerEvent.DOWN, this.onDownBound)
    app.off(PointerEvent.MOVE, this.onMoveBound)
    app.off(PointerEvent.UP, this.onUpBound)
  }

  // Bind handlers once to preserve 'this' and allow super calls
  protected onDownBound = (evt: PointerEvent) => this.onDown(evt)
  protected onMoveBound = (evt: PointerEvent) => this.onMove(evt)
  protected onUpBound = (evt: PointerEvent) => this.onUp(evt)

  protected onDown(evt: PointerEvent) {
    // 在开始绘制前清空当前选择
    const { app } = this.editor || {}
    if (app) {
      // 清空选择
      app.editor.target = undefined
    }
    
    const startPoint = evt.getPagePoint()
    this.element = this.createElement(startPoint)
    this.points.push(startPoint)
  }

  protected onMove(evt: PointerEvent) {
    const { app } = this.editor || {}
    if (!this.element) return

    if (app && !this.isDrawing) {
      app.tree.add(this.element)
      this.isDrawing = true
    }

    const endPoint = evt.getPagePoint()
    this.updateElement(this.element, endPoint)
  }

  protected onUp(evt: PointerEvent | null) {
    const params = this.getResult()
    this.callback?.(params)

    this.unBindEvents()
  }

  protected abstract createElement(startPoint?: IPointData): IUI
  protected abstract updateElement(element: IUI, endPoint: IPointData): void
  protected abstract getResult(): IDrawResult
}
