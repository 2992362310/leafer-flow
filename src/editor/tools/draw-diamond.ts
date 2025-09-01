import { Path, PointerEvent, type IPointData } from 'leafer'
import type { TCallback, Editor } from '../types'

interface IDrawDiamond {
  action: string
  diamond: Path | null
}

export class DrawDiamond {
  private editor: Editor | null = null
  private diamond: Path | null = null
  private startPoint: IPointData | null = null
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
    // 创建一个菱形路径，初始时是一个点
    const diamond = new Path({
      editable: true,
      fill: '#FF6B6B',
      stroke: '#333',
      strokeWidth: 1,
      opacity: 0.7,
    })

    this.startPoint = point
    this.diamond = diamond
  }

  onMove = (evt: PointerEvent) => {
    const { app } = this.editor || {}
    const { diamond, startPoint, isDrawing } = this
    if (!diamond || !startPoint) return

    const endPoint = evt.getPagePoint()
    const bounds = this.calculateDiamondBounds(startPoint, endPoint)
    
    // 创建菱形路径数据
    const pathData = `M ${bounds.centerX} ${bounds.y} L ${bounds.x + bounds.width} ${bounds.centerY} L ${bounds.centerX} ${bounds.y + bounds.height} L ${bounds.x} ${bounds.centerY} Z`
    diamond.path = pathData

    if (app && !isDrawing) {
      app.tree.add(diamond)
      this.isDrawing = true
    }
  }

  onUp = () => {
    const params: IDrawDiamond = { action: 'diamond', diamond: this.diamond }
    this.callback?.(params)

    // 结束绘制
    this.isDrawing = false
    this.diamond = null
    this.startPoint = null

    this.unBindEvents()
  }
  private calculateDiamondBounds(startPoint: IPointData, endPoint: IPointData) {
    const deltaX = endPoint.x - startPoint.x
    const deltaY = endPoint.y - startPoint.y

    const bounds = {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(deltaX),
      height: Math.abs(deltaY),
      centerX: 0,
      centerY: 0
    }

    bounds.centerX = bounds.x + bounds.width / 2
    bounds.centerY = bounds.y + bounds.height / 2

    return bounds
  }
}