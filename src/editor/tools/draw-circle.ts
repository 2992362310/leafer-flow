import { Ellipse, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawCircle extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      fill: '#b8328071',
      stroke: '#13ad8cff',
      strokeWidth: 1,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    const circle = new Ellipse({
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0,
      editable: true,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    })

    return circle
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    const startPoint = this.points[0]
    const circle = element as Ellipse
    const bounds = this.calculateEllipseBounds(startPoint, endPoint)
    const { x, y, width, height } = bounds
    circle.x = x
    circle.y = y
    circle.width = width
    circle.height = height
  }

  protected getResult(): IDrawResult {
    return {
      action: 'circle',
      element: this.element
    }
  }

  execute(callback: TCallback) {
    super.execute(callback)
  }

  private calculateEllipseBounds(startPoint: IPointData, endPoint: IPointData) {
    // 计算外接矩形的边界
    const { x: startX, y: startY } = startPoint
    const { x: endX, y: endY } = endPoint
    const minX = Math.min(startX, endX)
    const minY = Math.min(startY, endY)
    const maxX = Math.max(startX, endX)
    const maxY = Math.max(startY, endY)

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
