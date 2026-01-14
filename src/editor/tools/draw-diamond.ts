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
    if (!startPoint) return
    const group = element as Group
    const bounds = this.calculateDiamondBounds(startPoint, endPoint)
    const children = group.children
    if (!children || children.length < 2) return
    const diamond = children[0] as Path
    const text = children[1] as Text

    // 更新组位置
    group.x = bounds.x
    group.y = bounds.y

    // 创建菱形路径数据 (相对于组内 0,0)
    const { width, height, centerX, centerY } = bounds
    // M centerX 0 L width centerY L centerX height L 0 centerY Z
    const pathData = `M ${centerX} 0 L ${width} ${centerY} L ${centerX} ${height} L 0 ${centerY} Z`
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
    
    // 计算左上角和宽高
    const x = Math.min(startX, endX)
    const y = Math.min(startY, endY)
    const width = Math.abs(endX - startX)
    const height = Math.abs(endY - startY)
    
    const centerX = width / 2
    const centerY = height / 2

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
