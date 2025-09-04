import { Path, Text, Group, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawDiamond extends DrawBase {
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
    // 创建一个菱形路径，初始时是一个点
    const diamond = new Path({
      editable: false,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    })

    const text = new Text({
      draggable: false,
      editable: false,
      text: '菱形',
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
      children: [diamond, text],
    })

    return group
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint

    const startPoint = this.points[0]
    const group = element as Group
    const bounds = this.calculateDiamondBounds(startPoint, endPoint)

    const [diamond, text] = group.children

    // 创建菱形路径数据
    const { centerX, centerY, x, y, width, height } = bounds
    const pathData = `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`
    diamond.path = pathData

    text.width = Math.abs(width - 20)
    text.height = Math.abs(height - 20)
  }

  protected getResult(): IDrawResult {
    return {
      action: 'diamond',
      element: this.element
    }
  }

  execute(callback: TCallback) {
    super.execute(callback)
  }

  private calculateDiamondBounds(startPoint: IPointData, endPoint: IPointData) {
    const { x: startX, y: startY } = startPoint
    const { x: endX, y: endY } = endPoint
    const deltaX = endX - startX
    const deltaY = endY - startY

    const width = Math.abs(deltaX)
    const height = Math.abs(deltaY)
    const centerX = width / 2
    const centerY = height / 2

    return {
      x: 0,
      y: 0,
      width,
      height,
      centerX,
      centerY
    }
  }
}
