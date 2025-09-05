
import { PointerEvent, EditorMoveEvent, EditorScaleEvent, type App, type IUI, Rect } from 'leafer'

interface IConnectorConfig {
  stroke?: string
  strokeWidth?: number
  dashPattern?: number[]
}

const INITTIAL_CONF = {
  stroke: '#212121',
  strokeWidth: 16,
  dashPattern: [5, 5],
}

export default class Connector {
  private app: App
  private connectors = new Map()
  private nodeId: null | number = null
  private lines = new Map()
  private lineId: null | number = null
  private config: IConnectorConfig
  private bound: IUI

  constructor(app: App, config?: IConnectorConfig) {
    this.app = app
    this.config = Object.assign({}, INITTIAL_CONF, config)

    this.bound = Rect.one({
      x: 200,
      y: 200,
      width: 100,
      height: 100,
      stroke: '#123fbbff',
      strokeWidth: 8,
      zIndex: 100
    })

    app.tree.add(this.bound)

    this.bindEvents()
  }

  bindEvents() {
    const app = this.app
    const { editor } = app

    // app.on(PointerEvent.MOVE, this.onPoninterMove)
    editor.on(EditorMoveEvent.MOVE, this.onEditorMove)
    editor.on(EditorScaleEvent.SCALE, this.onEditorScale)
  }

  // onPoninterMove = (evt: PointerEvent) => {
  //   const el = this.app.tree.pick(evt)

  //   if (el.target) {
  //     const bounds = el.target.getBounds()
  //     this.bound.set(bounds)
  //   }
  // }

  onEditorMove = (evt: EditorMoveEvent) => {
    // console.log(EditorMoveEvent.MOVE, evt);
  }

  onEditorScale = (evt: EditorScaleEvent) => {
    // this.isScaling = true
  }

  addConnector({ nodeId, lineId }: { nodeId: number, lineId: number }) {
    this.connectors.set(nodeId, [lineId])
    this.lines.set(lineId, nodeId)
  }

  removeConnector({ nodeId, lineId }: { nodeId: number, lineId: number }) {
    this.connectors.delete(nodeId)
    this.lines.delete(lineId)
  }

  updateConnector({ nodeId, lineId }: { nodeId: number, lineId: number }) {
    const connector = this.connectors.get(nodeId)
    connector.push(lineId)
  }

  /**
   * 更新与指定元素相关的连接线
   * @param element 元素
   */
  private updateConnectorsForElement(element: IUI): void {

  }

  /**
   * 更新连接线位置
   * @param connector 连接线
   * @param from 起始元素
   * @param to 终止元素
   */
  private calc(connector: IUI, from: IUI, to: IUI): void {
    const fromBounds = from.getBounds()
    const toBounds = to.getBounds()

    const fromCenter = {
      x: fromBounds.x + fromBounds.width / 2,
      y: fromBounds.y + fromBounds.height / 2
    }

    const toCenter = {
      x: toBounds.x + toBounds.width / 2,
      y: toBounds.y + toBounds.height / 2
    }

    connector.set({ points: [fromCenter.x, fromCenter.y, toCenter.x, toCenter.y] })
  }

  clear() {

  }
}
