
/**
 * Connector Plugin Phase0/1 Implementation
 * 参考 design.md: 完成基础数据结构 + add/remove + debugDump + dispose。
 * 后续阶段将补充：交互、锚点计算、重连、RAF 批量更新等。
 */

// 仅引入最小必要类型，避免未使用警告；后续接入真实 Leafer 对象。
import { PointerEvent, Line, type App, type IUI } from 'leafer'

export interface Point { x: number; y: number }
export type NodeId = string
export type LineId = string

export interface LineStyle {
  stroke?: string
  strokeWidth?: number
  dash?: number[]
}

export interface LineLink {
  id: LineId
  sourceId: NodeId
  targetId: NodeId
  sourceAnchor?: Point
  targetAnchor?: Point
  style?: LineStyle
  meta?: Record<string, unknown>
}

export interface ConnectorOptions {
  haloPixel?: number
  allowSelfConnection?: boolean
  allowDuplicate?: boolean
  defaultLineStyle?: LineStyle
  batchRAF?: boolean
  dragThreshold?: number
  debug?: boolean
  enableHistory?: boolean
  onWillCreate?: (sourceId: NodeId, targetId: NodeId) => boolean | void
  onDidCreate?: (link: LineLink) => void
  onWillRemove?: (link: LineLink) => boolean | void
  onDidRemove?: (link: LineLink) => void
}

const DEFAULT_OPTIONS: Required<Pick<ConnectorOptions,
  'haloPixel' | 'allowSelfConnection' | 'allowDuplicate' | 'batchRAF' | 'dragThreshold'>> = {
  haloPixel: 8,
  allowSelfConnection: false,
  allowDuplicate: false,
  batchRAF: true,
  dragThreshold: 3
}

interface InternalStats {
  totalLines: number
  creates: number
  removes: number
  errors: number
  frameLinesUpdated?: number
  frameAnchorsRecomputed?: number
}

// 交互状态（扩展：创建 + 重连）
type InteractionMode = 'idle' | 'creating' | 'relinking'
interface InteractionState {
  mode: InteractionMode
  startNodeId?: NodeId
  startPoint?: Point
  hasDragged?: boolean
  tempLineId?: LineId // 临时线 id（仅内存，可与正式区分）
  tempVisual?: VisualLine
  startAnchor?: Point
  // 重连相关
  relinkingLineId?: LineId
  relinkingEnd?: 'source' | 'target'
  relinkBackup?: { sourceId: NodeId; targetId: NodeId }
}

// 指针事件最小结构（适配 Leafer / 原生）
type PointerLike = PointerEvent

// VisualLine 抽象：后续接入 Leafer 真实图形；当前为内存占位实现。
export interface VisualLine {
  id: LineId
  setPoints(p: [number, number, number, number]): void
  setStyle(style: LineStyle): void
  remove(): void
}

function createVisualLine(app: App, id: LineId, style?: LineStyle, initialPoints: [number, number, number, number] = [0, 0, 0, 0]): VisualLine {
  try {
    const baseConfig: Record<string, unknown> = { points: initialPoints }
    if (style) Object.assign(baseConfig, style)
    const LineCtor: unknown = Line
    const anyLine = LineCtor as { one?: (cfg: Record<string, unknown>) => unknown; new(cfg: Record<string, unknown>): unknown }
    interface LineInstance { set(o: Record<string, unknown>): void; remove(): void }
    const raw = typeof anyLine.one === 'function' ? anyLine.one(baseConfig) : new (Line as unknown as { new(cfg: Record<string, unknown>): unknown })(baseConfig)
    const lineInstance = raw as LineInstance | undefined
    if (lineInstance && typeof lineInstance.set === 'function') {
      app.tree.add(lineInstance as unknown as IUI)
      return {
        id,
        setPoints(p) { lineInstance.set({ points: p }) },
        setStyle(s) { lineInstance.set({ ...s } as Record<string, unknown>) },
        remove() { lineInstance.remove() }
      }
    }
  } catch {
    // fallback
  }
  let _points: [number, number, number, number] = initialPoints
  let _currentStyle = style
  return {
    id,
    setPoints(p) { _points = p },
    setStyle(s) { _currentStyle = { ..._currentStyle, ...s } },
    remove() { /* noop for fallback */ }
  }
}

export default class Connector {
  private app: App
  private options: ConnectorOptions
  private nodeLines: Map<NodeId, Set<LineId>> = new Map()
  private lineLinks: Map<LineId, LineLink> = new Map()
  private visualLines: Map<LineId, VisualLine> = new Map()
  private disposed = false
  private stats: InternalStats = { totalLines: 0, creates: 0, removes: 0, errors: 0, frameLinesUpdated: 0, frameAnchorsRecomputed: 0 }
  private state: InteractionState = { mode: 'idle' }
  private uiNodeIds: WeakMap<IUI, NodeId> = new WeakMap()
  private idToUI: Map<NodeId, IUI> = new Map()
  // overlay / handle
  private overlayLayer?: IUI
  private handles: Map<string, { lineId: LineId; end: 'source' | 'target'; ui: IUI }> = new Map()
  // RAF 调度相关
  private dirtyNodes: Set<NodeId> = new Set()
  private dirtyLines: Set<LineId> = new Set()
  private rafScheduled = false
  // 历史栈
  private history: Command[] = []
  private historyPointer = -1

  // 事件引用，用于解绑（根据 Leafer 实际事件 API 调整）
  private boundPointerDown?: (e: PointerLike) => void
  private boundPointerMove?: (e: PointerLike) => void
  private boundPointerUp?: (e: PointerLike) => void
  private boundKeyDown?: (e: KeyboardEvent) => void

  /**
   * 构造函数：初始化配置与内部索引（Phase0）
   * @param app 外部 Leafer App 引用
   * @param opts 可选配置，缺省使用 DEFAULT_OPTIONS
   */
  constructor(app: App, opts?: ConnectorOptions) {
    this.app = app
    this.options = { ...DEFAULT_OPTIONS, ...opts }
    // Phase0: 暂不绑定任何事件；后续阶段添加。
    this.bindPointerEvents()
    this.bindKeyEvents()
  }

  /**
   * 创建连接（基础版本：不含锚点计算与可视更新逻辑）。
   */
  /**
   * 创建新的连接（无向）。
   * 校验：自连/重复（根据配置）+ 用户钩子。创建失败返回 null。
   * TODO(Phase2+): 计算锚点并设置实际可视线坐标。
   */
  addConnection(sourceId: NodeId, targetId: NodeId, style?: LineStyle): LineId | null {
    if (this.options.enableHistory) {
      const snapshot: LineLink = { id: this.generateLineId(), sourceId, targetId, style: style || this.options.defaultLineStyle }
      const cmd = new AddConnectionCommand(this, snapshot)
      if (this.pushCommand(cmd)) return snapshot.id
      return null
    }
    return this._createConnectionRaw({ id: this.generateLineId(), sourceId, targetId, style: style || this.options.defaultLineStyle }) ? this.lastCreatedId : null
  }

  /**
   * 注册一个 UI 作为可连接节点，返回其 nodeId（如果已有则复用）。
   * 允许外部传入自定义 id；未提供则自动生成。
   */
  registerNode(ui: IUI, id?: NodeId): NodeId {
    if (this.disposed) throw new Error('Connector disposed')
    const existing = this.uiNodeIds.get(ui)
    if (existing) return existing
    const finalId = id || ('nd_' + Math.random().toString(36).slice(2, 9))
    this.uiNodeIds.set(ui, finalId)
    this.idToUI.set(finalId, ui)
    return finalId
  }

  /** 反注册节点（不会自动删除相关连线，需调用方先 removeConnection） */
  unregisterNode(id: NodeId) {
    const ui = this.idToUI.get(id)
    if (ui) {
      this.idToUI.delete(id)
      // WeakMap 无法显式删除键，只能等待 GC；这里不做额外处理
    }
  }

  /** 删除连接 */
  /**
   * 删除指定连接。成功返回 true；不存在或被钩子拦截返回 false。
   */
  removeConnection(lineId: LineId): boolean {
    if (this.options.enableHistory) {
      const link = this.lineLinks.get(lineId)
      if (!link) return false
      const cmd = new RemoveConnectionCommand(this, lineId)
      return this.pushCommand(cmd)
    }
    return !!this._removeConnectionRaw(lineId)
  }

  /** 是否存在连接（无向判定） */
  /**
   * 是否存在无向连接（a-b 或 b-a）。
   */
  hasConnection(a: NodeId, b: NodeId): boolean {
    const setA = this.nodeLines.get(a)
    if (!setA) return false
    for (const lid of setA) {
      const link = this.lineLinks.get(lid)
      if (!link) continue
      if ((link.sourceId === a && link.targetId === b) || (link.sourceId === b && link.targetId === a)) return true
    }
    return false
  }

  /** 获取某节点的所有连接 */
  /**
   * 获取某节点所有连接列表。
   */
  getConnectionsOfNode(nodeId: NodeId): LineLink[] {
    const set = this.nodeLines.get(nodeId)
    if (!set) return []
    const arr: LineLink[] = []
    for (const lid of set) {
      const link = this.lineLinks.get(lid)
      if (link) arr.push(link)
    }
    return arr
  }

  /** 调试输出（不包含可视对象详细结构） */
  /**
   * 调试输出内部状态（不包含可视实现细节）。
   */
  debugDump() {
    return {
      options: this.options,
      counts: {
        nodesIndexed: this.nodeLines.size,
        lines: this.lineLinks.size,
        visuals: this.visualLines.size
      },
      stats: this.stats,
      nodeLines: Array.from(this.nodeLines.entries()).reduce<Record<string, string[]>>((acc, [nid, set]) => { acc[nid] = Array.from(set); return acc }, {}),
      lineLinks: Array.from(this.lineLinks.entries()).reduce<Record<string, Omit<LineLink, 'meta'>>>((acc, [id, link]) => {
        const { meta: _meta, ...rest } = link
        acc[id] = rest
        return acc
      }, {})
    }
  }

  // 提供只读快照（命令内部使用）
  getLinkSnapshot(lineId: LineId): LineLink | undefined {
    const l = this.lineLinks.get(lineId)
    if (!l) return undefined
    return { ...l }
  }

  /** 释放插件（后续将确保取消事件监听） */
  /**
   * 释放插件：移除所有可视线与索引。幂等。
   */
  dispose() {
    if (this.disposed) return
    this.unbindPointerEvents()
    this.unbindKeyEvents()
    this.cancelInteraction()
    this.clearHandles()
    if (this.overlayLayer) {
      try {
        const candidate = this.overlayLayer as unknown as { remove?: () => void }
        candidate.remove?.()
      } catch { }
      this.overlayLayer = undefined
    }
    for (const v of this.visualLines.values()) v.remove()
    this.visualLines.clear()
    this.lineLinks.clear()
    this.nodeLines.clear()
    this.disposed = true
  }

  // ---------------- 内部辅助 ----------------
  private generateLineId(): LineId { return 'ln_' + Math.random().toString(36).slice(2, 10) }

  private indexLine(id: LineId, a: NodeId, b: NodeId) {
    let setA = this.nodeLines.get(a)
    if (!setA) { setA = new Set(); this.nodeLines.set(a, setA) }
    setA.add(id)
    let setB = this.nodeLines.get(b)
    if (!setB) { setB = new Set(); this.nodeLines.set(b, setB) }
    setB.add(id)
  }

  private unindexLine(id: LineId, a: NodeId, b: NodeId) {
    const setA = this.nodeLines.get(a); setA?.delete(id); if (setA && setA.size === 0) this.nodeLines.delete(a)
    const setB = this.nodeLines.get(b); setB?.delete(id); if (setB && setB.size === 0) this.nodeLines.delete(b)
  }

  // ---------------- Phase2: 事件绑定与交互骨架 ----------------
  private bindPointerEvents() {
    const down = (e: PointerEvent) => this.onPointerDown(e)
    const move = (e: PointerEvent) => this.onPointerMove(e)
    const up = (e: PointerEvent) => this.onPointerUp(e)
    this.app.on(PointerEvent.DOWN, down)
    this.app.on(PointerEvent.MOVE, move)
    this.app.on(PointerEvent.UP, up)
    this.boundPointerDown = down
    this.boundPointerMove = move
    this.boundPointerUp = up
  }

  private unbindPointerEvents() {
    if (this.boundPointerDown) this.app.off(PointerEvent.DOWN, this.boundPointerDown)
    if (this.boundPointerMove) this.app.off(PointerEvent.MOVE, this.boundPointerMove)
    if (this.boundPointerUp) this.app.off(PointerEvent.UP, this.boundPointerUp)
    this.boundPointerDown = this.boundPointerMove = this.boundPointerUp = undefined
  }

  private bindKeyEvents() {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.cancelInteraction()
    }
    window.addEventListener('keydown', keyHandler)
    this.boundKeyDown = keyHandler
  }

  private unbindKeyEvents() {
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown)
    this.boundKeyDown = undefined
  }

  private onPointerDown(e: PointerLike) {
    if (this.state.mode !== 'idle') this.cancelInteraction()
    // 优先检测 handle 命中 -> 进入重连状态
    const hp = this.hitHandle(e)
    if (hp) {
      this.startRelink(hp.lineId, hp.end)
      return
    }
    const hitNodeId = this.pickNodeId(e)
    if (!hitNodeId) return
    const anchor = this.computeNodeAnchor(hitNodeId)
    this.state = {
      mode: 'creating',
      startNodeId: hitNodeId,
      startPoint: this.eventToPoint(e),
      hasDragged: false
      , startAnchor: anchor
    }
  }

  private onPointerMove(e: PointerLike) {
    if (this.state.mode === 'creating') {
      const current = this.eventToPoint(e)
      if (!this.state.startPoint) return
      const dx = current.x - this.state.startPoint.x
      const dy = current.y - this.state.startPoint.y
      const dist2 = dx * dx + dy * dy
      if (!this.state.hasDragged && dist2 >= (this.options.dragThreshold || 3) ** 2) {
        // 初次拖拽超阈值 -> 生成临时线
        const tempId = this.generateLineId()
        const tempLine = createVisualLine(this.app, tempId, { stroke: '#888', strokeWidth: 1, dash: [4, 4] })
        this.state.tempLineId = tempId
        this.state.tempVisual = tempLine
        this.state.hasDragged = true
        this.visualLines.set(tempId, tempLine)
      }
      if (this.state.hasDragged && this.state.tempVisual && this.state.startAnchor) {
        const sp = this.state.startAnchor
        this.state.tempVisual.setPoints([sp.x, sp.y, current.x, current.y])
      }
      return
    }
    if (this.state.mode === 'relinking') {
      const lineId = this.state.relinkingLineId
      const end = this.state.relinkingEnd
      if (!lineId || !end) return
      const link = this.lineLinks.get(lineId)
      const v = this.visualLines.get(lineId)
      if (!link || !v) return
      const fixedAnchor = end === 'source'
        ? (link.targetAnchor || this.computeNodeAnchor(link.targetId))
        : (link.sourceAnchor || this.computeNodeAnchor(link.sourceId))
      const pointerPt = this.eventToPoint(e)
      // 如果当前指针在某节点上，则使用该节点的锚点预览
      const hoverNode = this.pickNodeId(e)
      let movingAnchor = pointerPt
      if (hoverNode) movingAnchor = this.computeNodeAnchor(hoverNode)
      if (end === 'source') {
        v.setPoints([movingAnchor.x, movingAnchor.y, fixedAnchor.x, fixedAnchor.y])
      } else {
        v.setPoints([fixedAnchor.x, fixedAnchor.y, movingAnchor.x, movingAnchor.y])
      }
    }
  }

  private onPointerUp(e: PointerLike) {
    if (this.state.mode === 'creating') {
      if (!this.state.hasDragged) { this.cancelInteraction(); return }
      const targetNodeId = this.pickNodeId(e)
      const sourceNodeId = this.state.startNodeId!
      if (!targetNodeId || targetNodeId === sourceNodeId) { this.cancelInteraction(); return }
      const lineId = this.addConnection(sourceNodeId, targetNodeId)
      if (lineId) {
        const link = this.lineLinks.get(lineId)
        if (link) {
          const sA = this.computeNodeAnchor(sourceNodeId)
          const tA = this.computeNodeAnchor(targetNodeId)
          link.sourceAnchor = sA
          link.targetAnchor = tA
          const v = this.visualLines.get(lineId)
          v?.setPoints([sA.x, sA.y, tA.x, tA.y])
        }
      }
      this.cancelInteraction()
      return
    }
    if (this.state.mode === 'relinking') {
      const lineId = this.state.relinkingLineId
      const end = this.state.relinkingEnd
      if (!lineId || !end) { this.cancelInteraction(); return }
      const targetNode = this.pickNodeId(e)
      if (!targetNode) { this.rollbackRelink(); return }
      const success = this.applyRelink(lineId, end, targetNode)
      if (!success) this.rollbackRelink()
      this.cancelInteraction()
    }
  }

  private cancelInteraction() {
    if (this.state.tempLineId) {
      const temp = this.visualLines.get(this.state.tempLineId)
      temp?.remove()
      this.visualLines.delete(this.state.tempLineId)
    }
    if (this.state.mode === 'relinking') this.rollbackRelink()
    this.state = { mode: 'idle' }
  }

  // ---------------- Placeholder Utilities ----------------
  private eventToPoint(e: PointerEvent): Point {
    const p = e.getPagePoint?.()
    if (p) return { x: p.x, y: p.y }
    // 兜底：如果不存在 getPagePoint
    // @ts-expect-error 兼容原生
    return { x: e.x ?? e.clientX ?? 0, y: e.y ?? e.clientY ?? 0 }
  }

  private pickNodeId(e: PointerEvent): NodeId | undefined {
    const rawTarget = e.target as IUI | undefined
    if (!rawTarget) return undefined
    let ui: IUI | undefined = rawTarget
    while (ui && (ui as unknown as { parent?: IUI }).parent && (ui as unknown as { parent?: IUI }).parent !== this.app.tree) {
      ui = (ui as unknown as { parent?: IUI }).parent as IUI
    }
    if (!ui) return undefined
    // 只有显式注册过的 UI 才视为节点；未注册返回 undefined，避免误命中
    return this.uiNodeIds.get(ui)
  }

  private computeNodeAnchor(id: NodeId): Point {
    const ui = this.idToUI.get(id) as (IUI & { width?: number; height?: number }) | undefined
    if (!ui) return { x: 0, y: 0 }
    const w = typeof ui.width === 'number' ? ui.width : 0
    const h = typeof ui.height === 'number' ? ui.height : 0
    return { x: (ui.x || 0) + w / 2, y: (ui.y || 0) + h / 2 }
  }

  // ---------------- Handles 实现 ----------------
  private handleKey(lineId: LineId, end: 'source' | 'target'): string { return lineId + ':' + end }

  showLineHandles(lineId: LineId) {
    const link = this.lineLinks.get(lineId)
    if (!link) return
    const sA = link.sourceAnchor || this.computeNodeAnchor(link.sourceId)
    const tA = link.targetAnchor || this.computeNodeAnchor(link.targetId)
    link.sourceAnchor = sA; link.targetAnchor = tA
    this.ensureOverlayLayer()
    this.ensureHandle(lineId, 'source', sA)
    this.ensureHandle(lineId, 'target', tA)
  }

  hideLineHandles(lineId?: LineId) {
    if (!lineId) {
      this.clearHandles()
      return
    }
    for (const end of ['source', 'target'] as const) {
      const key = this.handleKey(lineId, end)
      const h = this.handles.get(key)
      if (h) {
        try { (h.ui as unknown as { remove?: () => void }).remove?.() } catch { }
        this.handles.delete(key)
      }
    }
  }

  private ensureHandle(lineId: LineId, end: 'source' | 'target', anchor: Point) {
    const key = this.handleKey(lineId, end)
    let h = this.handles.get(key)
    if (!h) {
      const CircleCtor = (this.app as unknown as { Circle?: new (args: Record<string, unknown>) => IUI }).Circle || (globalThis as unknown as { Circle?: new (args: Record<string, unknown>) => IUI }).Circle
      if (!CircleCtor) return
      const ui = new CircleCtor({ name: 'connector-handle', radius: 5, fill: '#ffffff', stroke: '#409eff', strokeWidth: 1.5, editable: false })
      this.overlayLayer?.add(ui)
      h = { lineId, end, ui }
      this.handles.set(key, h)
    }
    // 位置更新
    try { (h.ui as unknown as { set?: (o: Record<string, unknown>) => void }).set?.({ x: anchor.x - 5, y: anchor.y - 5 }) } catch { }
  }

  private hitHandle(e: PointerEvent): { lineId: LineId; end: 'source' | 'target' } | undefined {
    const pt = this.eventToPoint(e)
    const r = 8 // 命中半径
    const r2 = r * r
    for (const h of this.handles.values()) {
      const ui = h.ui as unknown as { x?: number; y?: number; width?: number; height?: number }
      const cx = (ui.x || 0) + (ui.width || 10) / 2
      const cy = (ui.y || 0) + (ui.height || 10) / 2
      const dx = pt.x - cx
      const dy = pt.y - cy
      if (dx * dx + dy * dy <= r2) return { lineId: h.lineId, end: h.end }
    }
    return undefined
  }

  private startRelink(lineId: LineId, end: 'source' | 'target') {
    const link = this.lineLinks.get(lineId)
    if (!link) return
    this.state = {
      mode: 'relinking',
      relinkingLineId: lineId,
      relinkingEnd: end,
      relinkBackup: { sourceId: link.sourceId, targetId: link.targetId }
    }
  }

  private applyRelink(lineId: LineId, end: 'source' | 'target', newNodeId: NodeId): boolean {
    if (this.options.enableHistory) {
      const link = this.lineLinks.get(lineId)
      if (!link) return false
      const prev = { sourceId: link.sourceId, targetId: link.targetId }
      const next = end === 'source' ? { sourceId: newNodeId, targetId: link.targetId } : { sourceId: link.sourceId, targetId: newNodeId }
      const cmd = new RelinkConnectionCommand(this, lineId, prev, next)
      return this.pushCommand(cmd)
    }
    return this._relinkConnectionRaw(lineId, end, newNodeId)
  }

  private rollbackRelink() {
    if (this.state.relinkingLineId && this.state.relinkBackup) {
      const link = this.lineLinks.get(this.state.relinkingLineId)
      if (link) {
        // 若已被部分修改，可确保恢复（这里简单直接赋值）
        link.sourceId = this.state.relinkBackup.sourceId
        link.targetId = this.state.relinkBackup.targetId
        link.sourceAnchor = this.computeNodeAnchor(link.sourceId)
        link.targetAnchor = this.computeNodeAnchor(link.targetId)
        const v = this.visualLines.get(this.state.relinkingLineId)
        if (v && link.sourceAnchor && link.targetAnchor) v.setPoints([
          link.sourceAnchor.x, link.sourceAnchor.y,
          link.targetAnchor.x, link.targetAnchor.y
        ])
        this.showLineHandles(this.state.relinkingLineId)
      }
    }
  }

  // ---------------- Overlay & Handles 占位 ----------------
  private ensureOverlayLayer(): IUI | undefined {
    if (this.overlayLayer) return this.overlayLayer
    try {
      const appAny = this.app as unknown as { Group?: new (args: Record<string, unknown>) => IUI }
      const globalAny = globalThis as unknown as { Group?: new (args: Record<string, unknown>) => IUI }
      const GroupCtor = appAny.Group || globalAny.Group
      if (GroupCtor) {
        const layer = new GroupCtor({ name: 'connector-overlay', editable: false })
        this.app.tree.add(layer)
        this.overlayLayer = layer
        return layer
      }
    } catch { }
    return undefined
  }

  private clearHandles() {
    for (const h of this.handles.values()) {
      try { (h.ui as unknown as { remove?: () => void }).remove?.() } catch { }
    }
    this.handles.clear()
  }

  // ---------------- RAF 刷新骨架 ----------------
  markNodeDirty(nodeId: NodeId) {
    // 标记节点相关线脏，并同时失效这些线的锚点缓存（延迟到 flush 重算）
    this.dirtyNodes.add(nodeId)
    const set = this.nodeLines.get(nodeId)
    if (set) {
      for (const lid of set) {
        this.dirtyLines.add(lid)
        const link = this.lineLinks.get(lid)
        if (link) {
          if (link.sourceId === nodeId) link.sourceAnchor = undefined
          if (link.targetId === nodeId) link.targetAnchor = undefined
        }
      }
    }
    this.scheduleFlush()
  }

  /** 外部可直接标记某条线几何需要刷新（例如样式或策略变更） */
  markLineDirty(lineId: LineId) {
    this.dirtyLines.add(lineId)
    const link = this.lineLinks.get(lineId)
    if (link) { link.sourceAnchor = undefined; link.targetAnchor = undefined }
    this.scheduleFlush()
  }

  private scheduleFlush() {
    if (this.rafScheduled) return
    this.rafScheduled = true
    requestAnimationFrame(() => this.flush())
  }

  private flush() {
    // 重置本帧统计
    this.stats.frameLinesUpdated = 0
    this.stats.frameAnchorsRecomputed = 0
    // 聚合 node -> lines
    for (const nid of this.dirtyNodes) {
      const set = this.nodeLines.get(nid)
      if (set) for (const lid of set) this.dirtyLines.add(lid)
    }
    this.dirtyNodes.clear()
    // 更新几何
    for (const lid of this.dirtyLines) this.updateLineGeometry(lid)
    this.dirtyLines.clear()
    this.rafScheduled = false
  }

  private updateLineGeometry(lineId: LineId) {
    const link = this.lineLinks.get(lineId)
    if (!link) return
    // 若 anchor 丢失则重算
    if (!link.sourceAnchor) { link.sourceAnchor = this.computeNodeAnchor(link.sourceId); this.stats.frameAnchorsRecomputed = (this.stats.frameAnchorsRecomputed || 0) + 1 }
    if (!link.targetAnchor) { link.targetAnchor = this.computeNodeAnchor(link.targetId); this.stats.frameAnchorsRecomputed = (this.stats.frameAnchorsRecomputed || 0) + 1 }
    const v = this.visualLines.get(lineId)
    if (v && link.sourceAnchor && link.targetAnchor) {
      v.setPoints([
        link.sourceAnchor.x, link.sourceAnchor.y,
        link.targetAnchor.x, link.targetAnchor.y
      ])
      this.stats.frameLinesUpdated = (this.stats.frameLinesUpdated || 0) + 1
    }
  }

  // ---------------- Raw 基础操作（命令复用） ----------------
  private lastCreatedId: LineId | null = null
  _createConnectionRaw(data: { id: LineId; sourceId: NodeId; targetId: NodeId; style?: LineStyle }): boolean {
    if (this.disposed) return false
    const { id, sourceId, targetId } = data
    if (!sourceId || !targetId) return false
    if (!this.options.allowSelfConnection && sourceId === targetId) return false
    if (!this.options.allowDuplicate && this.hasConnection(sourceId, targetId)) return false
    if (this.options.onWillCreate) { if (this.options.onWillCreate(sourceId, targetId) === false) return false }
    const link: LineLink = { id, sourceId, targetId, style: data.style || this.options.defaultLineStyle }
    try {
      this.lineLinks.set(id, link)
      this.indexLine(id, sourceId, targetId)
      const vLine = createVisualLine(this.app, id, link.style)
      this.visualLines.set(id, vLine)
      link.sourceAnchor = this.computeNodeAnchor(sourceId)
      link.targetAnchor = this.computeNodeAnchor(targetId)
      if (link.sourceAnchor && link.targetAnchor) vLine.setPoints([
        link.sourceAnchor.x, link.sourceAnchor.y,
        link.targetAnchor.x, link.targetAnchor.y
      ])
      this.stats.totalLines++
      this.stats.creates++
      this.lastCreatedId = id
      this.options.onDidCreate?.(link)
      return true
    } catch (e) {
      this.stats.errors++
      this.lineLinks.delete(id)
      this.unindexLine(id, sourceId, targetId)
      this.visualLines.delete(id)
      if (this.options.debug) console.error('[Connector] _createConnectionRaw failed', e)
      return false
    }
  }

  _removeConnectionRaw(lineId: LineId): LineLink | null {
    if (this.disposed) return null
    const link = this.lineLinks.get(lineId)
    if (!link) return null
    if (this.options.onWillRemove) { if (this.options.onWillRemove(link) === false) return null }
    try {
      this.unindexLine(lineId, link.sourceId, link.targetId)
      this.lineLinks.delete(lineId)
      const v = this.visualLines.get(lineId)
      v?.remove(); this.visualLines.delete(lineId)
      this.stats.totalLines = Math.max(0, this.stats.totalLines - 1)
      this.stats.removes++
      this.options.onDidRemove?.(link)
      return link
    } catch (e) {
      this.stats.errors++
      if (this.options.debug) console.error('[Connector] _removeConnectionRaw failed', e)
      return null
    }
  }

  _relinkConnectionRaw(lineId: LineId, end: 'source' | 'target', newNodeId: NodeId): boolean {
    const link = this.lineLinks.get(lineId)
    if (!link) return false
    const otherId = end === 'source' ? link.targetId : link.sourceId
    if (!this.options.allowSelfConnection && newNodeId === otherId) return false
    if (!this.options.allowDuplicate && this.hasConnection(newNodeId, otherId)) return false
    try {
      this.unindexLine(lineId, link.sourceId, link.targetId)
      if (end === 'source') link.sourceId = newNodeId; else link.targetId = newNodeId
      this.indexLine(lineId, link.sourceId, link.targetId)
      link.sourceAnchor = this.computeNodeAnchor(link.sourceId)
      link.targetAnchor = this.computeNodeAnchor(link.targetId)
      const v = this.visualLines.get(lineId)
      if (v && link.sourceAnchor && link.targetAnchor) v.setPoints([
        link.sourceAnchor.x, link.sourceAnchor.y,
        link.targetAnchor.x, link.targetAnchor.y
      ])
      return true
    } catch (e) {
      if (this.options.debug) console.error('[Connector] _relinkConnectionRaw failed', e)
      return false
    }
  }

  // ---------------- 历史栈操作 ----------------
  private pushCommand(cmd: Command): boolean {
    const ok = cmd.do()
    if (!ok) return false
    if (this.historyPointer < this.history.length - 1) this.history.splice(this.historyPointer + 1)
    this.history.push(cmd)
    this.historyPointer = this.history.length - 1
    return true
  }

  undo(): boolean {
    if (!this.options.enableHistory) return false
    if (this.historyPointer < 0) return false
    const cmd = this.history[this.historyPointer]
    const ok = cmd.undo()
    if (ok) this.historyPointer--
    return ok
  }

  redo(): boolean {
    if (!this.options.enableHistory) return false
    if (this.historyPointer >= this.history.length - 1) return false
    const cmd = this.history[this.historyPointer + 1]
    const ok = cmd.do()
    if (ok) this.historyPointer++
    return ok
  }

  /**
   * 公共重连 API：显式修改某条线的 source 或 target。
   * next: { sourceId?: NodeId; targetId?: NodeId } 至少提供一个字段。
   */
  relinkConnection(lineId: LineId, next: { sourceId?: NodeId; targetId?: NodeId }): boolean {
    const link = this.getLinkSnapshot(lineId)
    if (!link) return false
    const desiredSource = next.sourceId ?? link.sourceId
    const desiredTarget = next.targetId ?? link.targetId
    if (desiredSource === link.sourceId && desiredTarget === link.targetId) return true
    if (this.options.enableHistory) {
      const cmd = new RelinkConnectionCommand(this, lineId, { sourceId: link.sourceId, targetId: link.targetId }, { sourceId: desiredSource, targetId: desiredTarget })
      return this.pushCommand(cmd)
    }
    // 优先判定哪个端点变化
    if (desiredSource !== link.sourceId) return this._relinkConnectionRaw(lineId, 'source', desiredSource)
    if (desiredTarget !== link.targetId) return this._relinkConnectionRaw(lineId, 'target', desiredTarget)
    return false
  }

  // ---------------- 调试辅助 API ----------------
  /** 校验 nodeLines 与 lineLinks 索引一致性 */
  validateIndexes(): { orphanLines: number; missingNodeRefs: number; nodeRefMismatches: number } {
    let orphanLines = 0
    let missingNodeRefs = 0
    let nodeRefMismatches = 0
    // 1. lineLinks 中 source/target 是否都在 nodeLines key 集合里
    const nodeIds = new Set(this.nodeLines.keys())
    for (const link of this.lineLinks.values()) {
      if (!nodeIds.has(link.sourceId) || !nodeIds.has(link.targetId)) missingNodeRefs++
    }
    // 2. nodeLines 中的 lineId 是否存在 lineLinks
    for (const [nid, set] of this.nodeLines.entries()) {
      for (const lid of set) {
        if (!this.lineLinks.has(lid)) {
          nodeRefMismatches++
        } else {
          // 双向验证：line 是否确实引用该 node
          const l = this.lineLinks.get(lid)!
          if (l.sourceId !== nid && l.targetId !== nid) nodeRefMismatches++
        }
      }
    }
    // 3. 孤儿 line：lineLinks 中引用的任一节点不在 idToUI (节点可能被外部删掉未通知)
    for (const link of this.lineLinks.values()) {
      if (!this.idToUI.has(link.sourceId) || !this.idToUI.has(link.targetId)) orphanLines++
    }
    return { orphanLines, missingNodeRefs, nodeRefMismatches }
  }

  /** 依据当前 lineLinks 重建 nodeLines （开发期修复工具） */
  rebuildIndexes(): { removed: LineId[]; reIndexed: number } {
    const removed: LineId[] = []
    const newNodeLines: Map<NodeId, Set<LineId>> = new Map()
    for (const [lid, link] of this.lineLinks.entries()) {
      // 若节点不存在（未注册 UI）则移除该 line
      if (!this.idToUI.has(link.sourceId) || !this.idToUI.has(link.targetId)) {
        removed.push(lid)
        this.lineLinks.delete(lid)
        const v = this.visualLines.get(lid); v?.remove(); this.visualLines.delete(lid)
        continue
      }
      let setA = newNodeLines.get(link.sourceId); if (!setA) { setA = new Set(); newNodeLines.set(link.sourceId, setA) }
      setA.add(lid)
      let setB = newNodeLines.get(link.targetId); if (!setB) { setB = new Set(); newNodeLines.set(link.targetId, setB) }
      setB.add(lid)
    }
    this.nodeLines = newNodeLines
    return { removed, reIndexed: this.lineLinks.size }
  }

  /** 返回调试统计（浅拷贝） */
  debugDumpStats() {
    return { ...this.stats }
  }
}

// ---------------- 命令对象定义 ----------------
interface Command { do(): boolean; undo(): boolean }

class AddConnectionCommand implements Command {
  private connector: Connector
  private snapshot: LineLink
  constructor(connector: Connector, snapshot: LineLink) { this.connector = connector; this.snapshot = snapshot }
  do(): boolean { return this.connector._createConnectionRaw(this.snapshot) }
  undo(): boolean { return !!this.connector._removeConnectionRaw(this.snapshot.id) }
}

class RemoveConnectionCommand implements Command {
  private connector: Connector
  private lineId: LineId
  private snapshot?: LineLink
  constructor(connector: Connector, lineId: LineId) { this.connector = connector; this.lineId = lineId }
  do(): boolean { const snap = this.connector._removeConnectionRaw(this.lineId); if (!snap) return false; this.snapshot = snap; return true }
  undo(): boolean { if (!this.snapshot) return false; return this.connector._createConnectionRaw(this.snapshot) }
}

class RelinkConnectionCommand implements Command {
  private connector: Connector
  private lineId: LineId
  private prev: { sourceId: NodeId; targetId: NodeId }
  private next: { sourceId: NodeId; targetId: NodeId }
  constructor(connector: Connector, lineId: LineId, prev: { sourceId: NodeId; targetId: NodeId }, next: { sourceId: NodeId; targetId: NodeId }) {
    this.connector = connector; this.lineId = lineId; this.prev = prev; this.next = next
  }
  do(): boolean {
    const link = this.connector.getLinkSnapshot(this.lineId)
    if (!link) return false
    const end: 'source' | 'target' = (link.sourceId !== this.next.sourceId) ? 'source' : 'target'
    return this.connector._relinkConnectionRaw(this.lineId, end, end === 'source' ? this.next.sourceId : this.next.targetId)
  }
  undo(): boolean {
    const link = this.connector.getLinkSnapshot(this.lineId)
    if (!link) return false
    const end: 'source' | 'target' = (link.sourceId !== this.prev.sourceId) ? 'source' : 'target'
    return this.connector._relinkConnectionRaw(this.lineId, end, end === 'source' ? this.prev.sourceId : this.prev.targetId)
  }
}
