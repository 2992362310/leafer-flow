import { Ellipse, PointerEvent, type IPointData } from 'leafer'
import type { TCallback, Editor } from '../types'

interface IDrawCircle {
  action: string
  circle: Ellipse | null
}

export class DrawCircle {
  private editor: Editor | null = null
  private circle: Ellipse | null = null
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
    const startPt = evt.getPagePoint()
    const circle = new Ellipse({
      ...startPt,
      width: 0,
      height: 0,
      editable: true,
      fill: '#b8328071',
      stroke: '#13ad8cff',
      strokeWidth: 1,
      opacity: 0.7,
    })

    this.points.push(startPt)
    this.circle = circle
  }

  onMove = (evt: PointerEvent) => {
    const { app } = this.editor || {}
    const { circle, isDrawing, points } = this
    if (!circle) return

    if (app && !isDrawing) {
      app.tree.add(circle)
      this.isDrawing = true
    }

    const endPoint = evt.getPagePoint()
    points[1] = endPoint
    const bounds = this.calculateEllipseBounds()
    circle.x = bounds.x
    circle.y = bounds.y
    circle.width = bounds.width
    circle.height = bounds.height
  }

  onUp = () => {
    const params: IDrawCircle = { action: 'circle', circle: this.circle }
    this.callback?.(params)

    // 结束绘制
    this.isDrawing = false
    this.circle = null
    this.points = []

    this.unBindEvents()
  }
  private calculateEllipseBounds() {
    const [startPoint, endPoint] = this.points
    // 计算外接矩形的边界
    const minX = Math.min(startPoint.x, endPoint.x)
    const minY = Math.min(startPoint.y, endPoint.y)
    const maxX = Math.max(startPoint.x, endPoint.x)
    const maxY = Math.max(startPoint.y, endPoint.y)

    const width = maxX - minX
    const height = maxY - minY

    return {
      x: minX,
      y: minY,
      width,
      height
    }
  }
}
