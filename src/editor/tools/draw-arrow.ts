import { PointerEvent, type IPointData, type IUI } from 'leafer'
import { Connector } from 'leafer-connector'
import type { IDrawOptions, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawArrow extends DrawBase {
  private options: IDrawOptions
  private startNode: IUI | null = null

  constructor(options?: IDrawOptions) {
    super()
    this.options = {
      stroke: '#278bfe',
      strokeWidth: 2,
      cornerRadius: 10,
      opacity: 0.7,
      ...options,
    }
  }

  protected createElement(startPoint: IPointData): IUI {
    // 1. 尝试拾取起始节点
    const pickResult = this.editor?.app.pick(startPoint)
    // 强制转换为 IUI，确保类型匹配
    this.startNode = pickResult ? (pickResult.target as IUI) : null

    if (!this.editor) {
      throw new Error('Editor is not initialized')
    }

    const connector = new Connector(this.editor.app, {
      // Point 模式初始化
      fromPoint: startPoint,
      toPoint: startPoint,

      // 样式配置
      stroke: this.options.stroke,
      strokeWidth: this.options.strokeWidth,
      cornerRadius: this.options.cornerRadius,
      endArrow: 'arrow', // 显式声明箭头
    })

    connector.opacity = this.options.opacity

    return connector
  }

  protected updateElement(element: IUI, endPoint: IPointData): void {
    // 更新坐标
    this.points[1] = endPoint

    const startPoint = this.points[0]
    if (startPoint) {
      const connector = element as Connector
      connector.setPoints(startPoint, endPoint)
    }
  }

  protected onUp(evt: PointerEvent | null) {
    if (!this.element) {
      super.onUp(evt)
      return
    }

    const connector = this.element as Connector

    // 获取终点
    let endPoint: IPointData
    if (evt && evt.getPagePoint) {
      endPoint = evt.getPagePoint()
    } else {
      const points = connector.getPoints()
      endPoint = points ? points.to : this.points[1] || { x: 0, y: 0 }
    }

    // 2. 尝试拾取终点节点
    // 此时 connector.hittable 为 false，不会拾取到自己
    const pickResult = this.editor?.app.pick(endPoint)
    // 强制转换为 IUI
    const endNode = pickResult ? (pickResult.target as IUI) : null

    // 3. 判断并切换模式
    if (this.startNode && endNode && this.startNode !== endNode) {
      // 双端连接：切换到 Node 模式
      connector.switchToNodeMode(this.startNode, endNode)
    } else {
      // 其他情况（半连接或无连接）：保持 Point 模式
      // 为了更好的视觉体验，我们可以将端点自动吸附到节点的中心，并将箭头样式改为圆形

      let fromPoint = connector.getPoints()?.from || this.points[0]
      let toPoint = endPoint

      // 确保 fromPoint 有值，如果 this.points[0] 为空（极少情况），给一个默认值
      if (!fromPoint) {
        fromPoint = { x: 0, y: 0 }
      }

      let hasConnection = false

      // 1. 起点吸附：如果此时处于 Point 模式，且存在起始节点，将起点吸附到节点中心
      if (this.startNode) {
        const bounds = this.startNode.getBounds('box', 'page')
        fromPoint = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        hasConnection = true
      }

      // 2. 终点吸附：如果存在终点节点，将终点吸附到节点中心
      if (endNode) {
        const bounds = endNode.getBounds('box', 'page')
        toPoint = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        hasConnection = true
      }

      // 3. 如果只是半连接（一端连了节点，一端悬空），将悬空端的箭头改为圆形
      // 注意：Connector 的 startArrow/endArrow 更新后可能需要刷新
      if (hasConnection) {
        if (!this.startNode) {
          // 起点悬空，起点设为圆形
          connector.startArrow = 'circle'
        }
        if (!endNode) {
          // 终点悬空，终点设为圆形
          connector.endArrow = 'circle'
        }
      }

      // 应用吸附后的坐标
      // 注意：这只是改变了线的坐标，并没有建立真正的 Node 绑定关系
      // 当移动节点时，线不会跟随移动。
      connector.setPoints(fromPoint, toPoint)
    }

    // 恢复交互能力
    connector.hittable = true

    super.onUp(evt)
  }

  protected getResult(): IDrawResult {
    return {
      action: 'arrow',
      element: this.element,
    }
  }
}
