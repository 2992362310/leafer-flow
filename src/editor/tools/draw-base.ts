import { PointerEvent, type IPointData, type IUI } from 'leafer'
import type { Editor, TCallback, IDrawOptions, IDrawResult } from '../types'

export { type IDrawOptions, type IDrawResult }

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

  cancel() {
    this.callback = undefined
    this.unBindEvents()
  }

  protected bindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    app.on(PointerEvent.DOWN, this.onDown)
    app.on(PointerEvent.MOVE, this.onMove)
    app.on(PointerEvent.UP, this.onUp)
  }

  protected unBindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    // 结束绘制
    this.isDrawing = false
    this.element = null
    this.points = []

    app.off(PointerEvent.DOWN, this.onDown)
    app.off(PointerEvent.MOVE, this.onMove)
    app.off(PointerEvent.UP, this.onUp)
  }

  protected onDown = (evt: PointerEvent) => {
    const startPoint = evt.getPagePoint()
    this.element = this.createElement(startPoint)
    this.points.push(startPoint)
  }

  protected onMove = (evt: PointerEvent) => {
    const { app } = this.editor || {}
    if (!this.element) return

    if (app && !this.isDrawing) {
      app.tree.add(this.element)
      this.isDrawing = true
    }

    const endPoint = evt.getPagePoint()
    this.updateElement(this.element, endPoint)
  }

  protected onUp = () => {
    const params = this.getResult()
    this.callback?.(params)

    this.unBindEvents()
  }

  protected abstract createElement(startPoint?: IPointData): IUI
  protected abstract updateElement(element: IUI, endPoint: IPointData): void
  protected abstract getResult(): IDrawResult
}
