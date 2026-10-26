import { PointerEvent, type IPointData, type IUI } from 'leafer'
import type { Editor, TCallback, IDrawResult } from '../types'

export abstract class DrawBase {
  protected editor: Editor | null = null
  protected element: IUI | null = null
  protected points: IPointData[] = []
  protected isDrawing = false
  protected callback?: TCallback
  protected shiftKey = false

  init(editor: Editor) {
    this.editor = editor
  }

  execute(callback: TCallback) {
    this.callback = callback
    this.bindEvents()
  }

  createFixedElement(startPoint: IPointData, endPoint: IPointData): IUI {
    const element = this.createElement(startPoint)
    this.points = [startPoint, endPoint]
    this.updateElement(element, endPoint)
    this.points = []
    return element
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
    this.shiftKey = evt.shiftKey
  }

  protected onMove(evt: PointerEvent) {
    const { app } = this.editor || {}
    if (!this.element) return

    if (app && !this.isDrawing) {
      app.tree.add(this.element)
      this.isDrawing = true
    }

    const endPoint = this.normalizePoint(this.points[0], evt.getPagePoint(), evt.shiftKey)
    this.updateElement(this.element, endPoint)
  }

  protected onUp(_evt: PointerEvent | null) {
    const params = this.getResult()
    this.callback?.(params)

    this.unBindEvents()
  }

  protected normalizePoint(
    start: IPointData | undefined,
    end: IPointData,
    shiftKey = false,
  ): IPointData {
    if (!start || !shiftKey) return end

    const dx = end.x - start.x
    const dy = end.y - start.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    const max = Math.max(absX, absY)

    if (max === 0) return end

    if (absX > absY * 1.5) {
      return { x: start.x + Math.sign(dx) * max, y: start.y }
    }

    if (absY > absX * 1.5) {
      return { x: start.x, y: start.y + Math.sign(dy) * max }
    }

    const signX = Math.sign(dx) || 1
    const signY = Math.sign(dy) || 1
    return { x: start.x + signX * max, y: start.y + signY * max }
  }

  protected abstract createElement(startPoint?: IPointData): IUI
  protected abstract updateElement(element: IUI, endPoint: IPointData): void
  protected abstract getResult(): IDrawResult
}
