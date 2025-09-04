import { Group, Rect, Text, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawRect extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      fill: '#FEB027',
      stroke: '#13ad8cff',
      cornerRadius: 10,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    const rect = new Rect({
      editable: false,
      fill: this.options.fill,
      cornerRadius: this.options.cornerRadius,
      opacity: this.options.opacity,
    })

    const text = new Text({
      draggable: false,
      editable: false,
      text: '矩形',
      fill: '#333',
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      x: 10,
      y: 10,
    })

    const group = new Group({
      editable: true,
      x: startPoint.x,
      y: startPoint.y,
      children: [rect, text],
    })

    return group
  }

  protected updateElement(element: IUI, endPoint: IPointData) {
    this.points[1] = endPoint

    const startPoint = this.points[0]
    const group = element as Group
    const bounds = this.calculateRectBounds(startPoint, endPoint)
    const { x, y, width, height } = bounds
    group.x = x
    group.y = y

    const [rect, text] = group.children
    rect.width = width
    rect.height = height

    text.width = Math.abs(width - 20)
    text.height = Math.abs(height - 20)
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
