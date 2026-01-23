import { Path, type IPointData, type IUI } from 'leafer'
import type { IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

// 可选：手绘抖动函数
function jitterPoints(points: IPointData[], jitterAmount = 0.5): IPointData[] {
  return points.map((p) => ({
    x: p.x + (Math.random() - 0.5) * jitterAmount,
    y: p.y + (Math.random() - 0.5) * jitterAmount,
  }))
}

export class DrawFreehand extends DrawBase {
  private options: IDrawOptions
  private drawingPoints: IPointData[] = []

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      stroke: '#222',
      strokeWidth: 2,
      opacity: 0.8,
      ...options,
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    this.drawingPoints = [startPoint]
    const path = new Path({
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
      path: `M${startPoint.x},${startPoint.y}`,
    })
    return path
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.drawingPoints.push(endPoint)
    // 绘制过程中不抖动，保持原始轨迹
    let d = ''
    for (let i = 0; i < this.drawingPoints.length; i++) {
      const p = this.drawingPoints[i]
      if (p) {
        d += i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
      }
    }
    ; (element as Path).path = d
  }

  protected getResult(): IDrawResult {
    // 鼠标抬起时对点进行抖动
    if (this.element) {
      const points = jitterPoints(this.drawingPoints)
      let d = ''
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        if (p) {
          d += i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
        }
      }
      ; (this.element as Path).path = d
    }
    return {
      action: 'freehand',
      element: this.element,
    }
  }
}
