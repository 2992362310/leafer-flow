import { Rect, PointerEvent, type IPointData } from 'leafer'
import type { TCallback, Editor } from '../types'

interface IDrawRect {
  action: string
  rect: Rect | null
}

export class DrawRect {
  private editor: Editor | null = null
  private rect: Rect | null = null
  private points: IPointData[] = []
  private isDrawing = false
  private callback?: TCallback

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
  bindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    // 使用箭头函数，this指向外部作用域
    app.on(PointerEvent.DOWN, this.onDown)
    app.on(PointerEvent.MOVE, this.onMove)
    app.on(PointerEvent.UP, this.onUp)
  }
  unBindEvents() {
    const { app } = this.editor || {}
    if (!app) return

    app.off(PointerEvent.DOWN, this.onDown)
    app.off(PointerEvent.MOVE, this.onMove)
    app.off(PointerEvent.UP, this.onUp)
  }
  onDown = (evt: PointerEvent) => {
    const point = evt.getPagePoint()
    const rect = new Rect({
      ...point,
      editable: true,
      fill: '#FEB027',
      cornerRadius: 10,
      opacity: 0.7,
    })

    this.points.push(point)
    this.rect = rect
  }

  onMove = (evt: PointerEvent) => {
    const { app } = this.editor || {}
    const { rect, isDrawing, points, calculateRectBounds } = this
    if (!rect) return

    if (app && !isDrawing) {
      app.tree.add(rect)
      this.isDrawing = true
    }

    const endPoint = evt.getPagePoint()
    const bounds = calculateRectBounds(points[0], endPoint)
    rect.x = bounds.x
    rect.y = bounds.y
    rect.width = bounds.width
    rect.height = bounds.height
  }

  onUp = () => {
    const params: IDrawRect = { action: 'rect', rect: this.rect }
    this.callback?.(params)

    // 结束绘制
    this.isDrawing = false
    this.rect = null
    this.points = []

    this.unBindEvents()
  }
  private calculateRectBounds(startPoint: IPointData, endPoint: IPointData) {
    const deltaX = endPoint.x - startPoint.x
    const deltaY = endPoint.y - startPoint.y

    const bounds = {
      x: 0,
      y: 0,
      width: Math.abs(deltaX),
      height: Math.abs(deltaY),
    }

    if (deltaX >= 0 && deltaY >= 0) {
      // 右下方向
      bounds.x = startPoint.x
      bounds.y = startPoint.y
    } else if (deltaX < 0 && deltaY >= 0) {
      // 左下方向
      bounds.x = startPoint.x + deltaX
      bounds.y = startPoint.y
    } else if (deltaX >= 0 && deltaY < 0) {
      // 右上方向
      bounds.x = startPoint.x
      bounds.y = startPoint.y + deltaY
    } else {
      // 左上方向
      bounds.x = startPoint.x + deltaX
      bounds.y = startPoint.y + deltaY
    }

    return bounds
  }
}
