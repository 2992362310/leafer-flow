import { Path, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawDiamond extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      fill: '#FF6B6B',
      stroke: '#333',
      strokeWidth: 1,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(): IUI {
    // 创建一个菱形路径，初始时是一个点
    const diamond = new Path({
      editable: true,
      fill: this.options.fill,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
    })

    return diamond
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint

    const startPoint = this.points[0]
    const diamond = element as Path
    const bounds = this.calculateDiamondBounds(startPoint, endPoint)

    // 创建菱形路径数据
    const { centerX, centerY, x, y, width, height } = bounds
    const pathData = `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`
    diamond.path = pathData
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

    const x = Math.min(startX, endX)
    const y = Math.min(startY, endY)
    const width = Math.abs(deltaX)
    const height = Math.abs(deltaY)
    const centerX = x + width / 2
    const centerY = y + height / 2

    return {
      x,
      y,
      width,
      height,
      centerX,
      centerY
    }
  }
}
