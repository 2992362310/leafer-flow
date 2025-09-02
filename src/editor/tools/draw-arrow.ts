import { Arrow, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawArrow extends DrawBase {
  private options: IDrawOptions

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      stroke: '#278bfe',
      strokeWidth: 2,
      cornerRadius: 10,
      opacity: 0.7,
      ...options
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    const points = [startPoint]
    const arrow = new Arrow({
      points,
      editable: true,
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      cornerRadius: this.options.cornerRadius,
      opacity: this.options.opacity,
    })

    return arrow
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.points[1] = endPoint

    const startPoint = this.points[0]
    const arrow = element as Arrow
    arrow.points = [startPoint, endPoint]
  }

  protected getResult(): IDrawResult {
    return {
      action: 'arrow',
      element: this.element
    }
  }

  execute(callback: TCallback) {
    super.execute(callback)
  }
}
