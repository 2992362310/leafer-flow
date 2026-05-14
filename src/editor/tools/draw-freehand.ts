import { Path, type IPointData, type IUI } from 'leafer'
import type { IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

/**
 * 自由绘制选项
 */
interface FreehandOptions {
  stroke: string
  strokeWidth: number
  opacity: number
  smoothness: number // 平滑度 (0-1)
  streamline: number // 流线化程度 (0-1)
  taperStart: boolean // 起点渐细
  taperEnd: boolean // 终点渐细
}

/**
 * 计算两点之间的距离
 */
function distance(p1: IPointData, p2: IPointData): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

/**
 * 简化点集：移除距离太近的点
 */
function simplifyPoints(points: IPointData[], tolerance = 1): IPointData[] {
  if (points.length < 3) return points

  const result: IPointData[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]

    if (distance(prev, curr) >= tolerance) {
      result.push(curr)
    }
  }

  return result
}

/**
 * 获取线段的中点
 */
function getMidPoint(p1: IPointData, p2: IPointData): IPointData {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

/**
 * 将点数组转换为平滑的 SVG 路径（使用二次贝塞尔曲线）
 * 这是一个简单高效的平滑算法
 */
function pointsToSmoothPath(points: IPointData[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`

  let path = `M${points[0].x},${points[0].y}`

  // 使用二次贝塞尔曲线平滑连接
  // 算法：每两个点之间用中点作为控制点
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]

    if (!p0 || !p1 || !p2) continue

    const mid1 = getMidPoint(p0, p1)
    const mid2 = getMidPoint(p1, p2)

    // 从 mid1 到 mid2，以 p1 为控制点
    path += ` L${mid1.x},${mid1.y} Q${p1.x},${p1.y} ${mid2.x},${mid2.y}`
  }

  // 连接到最后一个点
  const lastPoint = points[points.length - 1]
  const secondLastPoint = points[points.length - 2]

  if (lastPoint && secondLastPoint) {
    const mid = getMidPoint(secondLastPoint, lastPoint)
    path += ` L${mid.x},${mid.y} L${lastPoint.x},${lastPoint.y}`
  }

  return path
}

/**
 * 自由绘制工具类
 * 使用二次贝塞尔曲线实现平滑的线条
 */
export class DrawFreehand extends DrawBase {
  private options: FreehandOptions
  private drawingPoints: IPointData[] = []

  constructor(options?: IDrawOptions & Partial<FreehandOptions>) {
    super()

    this.options = {
      stroke: '#333333',
      strokeWidth: 2,
      opacity: 1,
      smoothness: 0.5,
      streamline: 0.5,
      taperStart: false,
      taperEnd: false,
      ...options,
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    this.drawingPoints = [startPoint]

    const path = new Path({
      editable: true, // 允许选中和编辑
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      opacity: this.options.opacity,
      path: `M${startPoint.x},${startPoint.y}`,
      strokeLineCap: 'round', // 圆角端点
      strokeLineJoin: 'round', // 圆角连接
    })

    return path
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    this.drawingPoints.push(endPoint)

    // 简化点集（保留更多点，减少容差）
    const sampled = simplifyPoints(this.drawingPoints, 1)

    // 绘制过程中就使用平滑曲线
    const smoothPath = pointsToSmoothPath(sampled)

    ;(element as Path).path = smoothPath
  }

  protected getResult(): IDrawResult {
    if (!this.element) {
      return {
        action: 'freehand',
        element: this.element,
      }
    }

    // 最终处理：进一步简化点集（容差更小，保留更多细节）
    const sampled = simplifyPoints(this.drawingPoints, 0.5)

    if (sampled.length < 2) {
      return {
        action: 'freehand',
        element: this.element,
      }
    }

    // 生成最终的平滑路径
    const finalPath = pointsToSmoothPath(sampled)

    ;(this.element as Path).path = finalPath

    return {
      action: 'freehand',
      element: this.element,
    }
  }
}
