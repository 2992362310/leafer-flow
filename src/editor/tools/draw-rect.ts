import { Rect, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawRect extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      fill: '#FEB027',
      cornerRadius: 10,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    const rect = new Rect({
      x: startPoint.x,
      y: startPoint.y,
      editable: true,
      fill: this.options.fill,
      cornerRadius: this.options.cornerRadius,
      opacity: this.options.opacity,
    })

    return rect
  }

  protected updateElement(element: IUI, endPoint: IPointData) {
    this.points[1] = endPoint

    const startPoint = this.points[0]
    const rect = element as Rect
    const bounds = this.calculateRectBounds(startPoint, endPoint)
    const { x, y, width, height } = bounds
    rect.x = x
    rect.y = y
    rect.width = width
    rect.height = height
  }

  protected getResult(): IDrawResult {
    return {
      action: 'rect',
      element: this.element
    }
  }

  execute(callback: TCallback) {
    super.execute(callback)
  }

  private calculateRectBounds(startPoint: IPointData, endPoint: IPointData) {
    const { x: startX, y: startY } = startPoint
    const { x: endX, y: endY } = endPoint
    const deltaX = endX - startX
    const deltaY = endY - startY

    const width = Math.abs(deltaX)
    const height = Math.abs(deltaY)

    let x = 0
    let y = 0

    if (deltaX >= 0 && deltaY >= 0) {
      // 右下方向
      x = startX
      y = startY
    } else if (deltaX < 0 && deltaY >= 0) {
      // 左下方向
      x = startX + deltaX
      y = startY
    } else if (deltaX >= 0 && deltaY < 0) {
      // 右上方向
      x = startX
      y = startY + deltaY
    } else {
      // 左上方向
      x = startX + deltaX
      y = startY + deltaY
    }

    return {
      x,
      y,
      width,
      height,
    }
  }
}
