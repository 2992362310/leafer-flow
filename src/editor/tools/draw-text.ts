import { Text, PointerEvent, type IPointData, type IUI } from 'leafer'
import type { TCallback, IDrawResult } from '../types'
import { DrawBase } from './draw-base'

export class DrawText extends DrawBase {
  protected element: IUI | null = null

  protected createElement(startPoint: IPointData): IUI {
    const text = new Text({
      x: startPoint.x,
      y: startPoint.y,
      text: '双击编辑文本',
      editable: true,
      fill: '#000000',
      fontSize: 16,
    })

    return text
  }

  protected updateElement(element: IUI, endPoint: IPointData) {
    // 文本工具不需要更新元素
  }

  protected getResult(): IDrawResult {
    return {
      action: 'text',
      element: this.element
    }
  }

  execute(callback: TCallback) {
    this.callback = callback
    this.bindTextEvents()
  }

  private bindTextEvents() {
    const { app } = this.editor || {}
    if (!app) return

    // 只绑定点击事件，不需要鼠标移动事件
    app.on(PointerEvent.DOWN, this.onDown)
  }

  private unBindTextEvents() {
    const { app } = this.editor || {}
    if (!app) return

    app.off(PointerEvent.DOWN, this.onDown)
  }

  protected onDown = (evt: PointerEvent) => {
    const startPoint = evt.getPagePoint()
    this.element = this.createElement(startPoint)

    const { app } = this.editor || {}
    if (app && this.element) {
      app.tree.add(this.element)

      // 立即将焦点设置到文本元素上，使其进入编辑状态
      app.editor.target = this.element as Text
      app.editor.focus()

      // 绑定失去焦点事件，当用户点击其他地方时完成绘制
      this.element.once('blur', () => {
        this.onTextBlur()
      })
    }

    // 完成绘制操作
    this.unBindTextEvents()
    const params = this.getResult()
    this.callback?.(params)
  }

  private onTextBlur = () => {
    // 当文本失去焦点时，结束绘制操作
    this.element = null
  }
}
