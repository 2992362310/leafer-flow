import { Ellipse, Text, Group, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawCircle extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      fill: '#FEB027',
      stroke: '#13ad8cff',
      strokeWidth: 1,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    const circle = new Ellipse({
      editable: false,
      width: 0,
      height: 0,
      x: startPoint.x,
      y: startPoint.y,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    })

    const text = new Text({
      draggable: false,
      editable: false,
      text: '椭圆',
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
      children: [circle, text],
    })

    return group
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    const startPoint = this.points[0]
    const group = element as Group
    const bounds = this.calculateEllipseBounds(startPoint, endPoint)

    const [circle, text] = group.children
    const { x, y, width, height } = bounds

    circle.x = x
    circle.y = y
    circle.width = width
    circle.height = height

    text.width = Math.abs(width - 20)
    text.height = Math.abs(height - 20)
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
      x: 0,
      y: 0,
      width,
      height
    }
  }
}
