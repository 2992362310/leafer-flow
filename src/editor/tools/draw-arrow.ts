import { PointerEvent, Arrow, type IPointData } from 'leafer'
import type { Editor, TCallback } from '../types'

interface IDrawArrow {
  action: string
  arrow: Arrow | null
}

export class DrawArrow {
  private editor: Editor | null = null
  private arrow: Arrow | null = null
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

    app.off(PointerEvent.CLICK, this.onDown)
    app.off(PointerEvent.MOVE, this.onMove)
    app.off(PointerEvent.UP, this.onUp)
  }
  onDown = (evt: PointerEvent) => {
    const points = [{ x: evt.x, y: evt.y }]
    const arrow = new Arrow({
      points,
      editable: true,
      stroke: '#278bfe',
      strokeWidth: 2,
      cornerRadius: 10,
      opacity: 0.7,
    })

    this.points = points
    this.arrow = arrow
  }
  onMove = (evt: PointerEvent) => {
    const { app } = this.editor || {}
    const { arrow, points, isDrawing } = this
    if (!arrow) return

    const point = { x: evt.x, y: evt.y }
    arrow.points = [points[0], point]

    if (app && !isDrawing) {
      app.tree.add(arrow)
      this.isDrawing = true
    }
  }
  onUp = () => {
    const params: IDrawArrow = { action: 'arrow', arrow: this.arrow }
    this.callback?.(params)

    // 结束绘制
    this.isDrawing = false
    this.arrow = null
    this.points = []

    this.unBindEvents()
  }
}
