<!--
	Design Document: Connector Plugin (Leafer)
	Version: V1.0
	Status: Approved / Ready for Implementation
	Last Update: 2025-10-11
-->

# 连接器插件设计（V1 总览）

## 快速导航

1. [背景与原始思路](#连接器插件设计) (原始段落保留)
2. [扩展版设计概述](#扩展版设计v2-草案)
3. [数据结构与接口](#扩展版设计v2-草案)
4. [锚点与几何算法详化](#锚点与几何算法详化)
5. [事件与生命周期](#事件与生命周期)
6. [性能与优化策略](#性能与优化策略)
7. [Undo / Redo 集成策略](#undo--redo-集成策略)
8. [错误与边界处理](#错误与边界处理)
9. [阶段化实施步骤](#阶段化实施步骤与验收标准)
10. [交互状态机](#交互状态机fsm细化)
11. [扩展 Backlog & 版本说明](#扩展-backlog--版本说明)

## 概述

该插件为 Leafer 编辑器提供“节点之间可视连接线”能力。目标：在保证核心交互（创建、重连、节点变换联动）顺畅与数据一致的前提下，为后续端口、折线、自动路由、标签、箭头等高级功能预留扩展接口。

## 范围

当前版本仅实现：矩形节点、直线连接、边缘/中心锚点算法、基础高亮、撤销重做集成、性能批处理。暂不含：端口系统、折线/避障、方向箭头、多形状路由策略、标签、批量操作。

## 术语表

| 术语              | 含义                                 |
| ----------------- | ------------------------------------ |
| Node              | 编辑器中的可被连接的图形节点         |
| Line / Connection | 连接两节点的可视直线对象及其逻辑关系 |
| Anchor            | 线与节点的接触点（动态计算）         |
| Halo              | 节点边缘外的一圈吸附检测区域（像素） |
| Resolver          | 针对不同形状计算锚点的策略对象       |
| Creating          | 拖拽创建交互状态                     |
| Relinking         | 拖拽修改线端点的交互状态             |
| Dirty Node/Line   | 需要在 RAF 中刷新几何的节点/连线     |

## 设计原则（补充）

- 原子性：任何索引与可视对象创建/删除需在异常时可回滚。
- 层次分离：数据层 (lineLinks/nodeLines) 与渲染层 (visualLine/overlay) 解耦。
- 可测试：几何与状态机逻辑无 UI 依赖，便于单元测试（未来）。
- 渐进增强：基础直线实现 -> 扩展更多策略不破坏现有 API。

# 原始设计 & 逐步扩展

- 基于 `@leafer-in/editor` 实现

1 内部维护 connectors, 数据结构为 Map, key 为 节点 id, value 为连接线的 ids(`节点 id 和 连线 ids 为一对多`)

2 暴露添加连接器接口, 当开始添加连接器时，查找是否已有节点

2.1 若没有，则在 connectors 添加节点 id, value 为空数组, 在数组添加连线 id

2.2 若有，则查找节点 id 对应的数组，添加连线 id

3 在构造函数中，添加 editor 的 resize 和 move 事件监听，当节点改变时，更新连线

4 连线方式, 首先获取节点的边缘，根据连线方式，生成节点的连接点

4.1 直连，若鼠标在节点边缘附近一定范围内，则在离数据最近的节点边缘生成连接点，更新连接线

4.2 直连，若鼠标在节点内，获取节点中心点和连线起点所产生的直线，与节点边缘相交的点作为连接点，更新连接线

5 边缘连接时，连接器内部维护一个节点的边框（线宽可动态调整，默认为8），，在画布上显示，当松开鼠标更新完连线后，移除并销毁边框

6 暴露删除连接器接口，开始编辑时，检查鼠标所在位置的元素节点，检查对应节点是否有连接器

6.1 若有，则检查连接器是否有所在位置的连线，当移动对应连线的终点时，若新连线不满足连接的条件，则删除该连接器，若满足连接条件，则更新连线

6.2 若没有，则检查鼠标所在位置的元素节点，检查对应节点是否有连接器，若没有，则添加连接器

7 内部维护 lianes, 数据结构为 Set, key 为 连线 id, value 为 节点 id (`连线 id 和 节点 id 为一对一`)

7.1 在 2.1 的基础上，更新 lianes 数据，新增对应的 连线id

7.2 在6.1 的基础上，更新 lianes 数据， 删除对应的 连线id

# 总接

1 节点拖拽时，检查鼠标所在位置的元素节点id，检查对应节点是否有connector，若有，则进行相关动作

2 连线拖拽时，检查鼠标所在位置的连线di，检查对应节点是否有 liane，若有，则进行相关动作

---

## 扩展版设计（V2 草案）

### 1. 范围与目标

当前阶段聚焦：矩形节点之间的直线连接。支持拖拽创建、端点重连、节点变换(移动/尺寸/旋转)后自动更新、边缘/中心算法吸附、高亮辅助，禁止自连与重复（无向）连接。为后续多形状、端口、折线/曲线、Undo/Redo 扩展做接口预留。

### 2. 功能需求列表

R1 节点到连线反向索引 R2 连线两端节点存储 R3 创建/删除连线 API R4 节点删除级联 R5 查询接口
R6 拖拽创建 R7 端点重连 R8 节点 hover 高亮 R9 临时连线预览 R10 取消交互 R11 端点 handle 显示
R12 外部 halo 吸附 R13 内部中心射线 R14 旋转矩形交点 R15 像素/世界坐标换算 R16 RAF 合帧
R17 节点移动更新 R18 节点尺寸/旋转更新 R19 批处理刷新
R20 禁止重复 R21 禁止自连 R22 重连失败回滚 R23 删除节点后的清理
R24 AddConnection Command R25 RemoveConnection Command R26 RelinkConnection Command R27 Command 可序列化
R28 初始化 R29 销毁 R30 启停 R31 锚点策略接口 R32 Port 预留 R33 曲线/折线预留 R34 外部验证钩子

### 3. 数据结构

```
nodeLines: Map<NodeId, Set<LineId>>
lineLinks: Map<LineId, LineLink>

LineLink {
	id: string
	sourceId: string
	targetId: string
	sourceAnchor?: Point
	targetAnchor?: Point
	style?: LineStyle
	meta?: Record<string, any>
}

InteractionState {
	mode: 'idle' | 'creating' | 'relinking' | 'drag-preview' | 'hovering'
	activeLineId?: string
	tempLine?: VisualLine
	creatingFromNodeId?: string
	relinkingLineId?: string
	relinkingEnd?: 'source' | 'target'
	hoverNodeId?: string
	lastCursor?: Point
}
```

### 4. 关键接口

```
addConnection(sourceId, targetId, style?) => lineId | null
removeConnection(lineId) => boolean
relinkConnection(lineId, newSourceId, newTargetId) => boolean
getConnectionsOfNode(nodeId) => LineLink[]
hasConnection(a,b) => boolean
startCreateFromNode(nodeId, startPoint?)
startRelink(lineId, end)
cancelInteraction()
dispose()
```

### 5. 锚点策略（AnchorResolver）

```
resolve({ node, refPoint, haloWorld }) => Point
isInHalo?(ctx, cursor) => boolean
```

默认实现 rectangle：

1. cursor 在扩展 bbox( haloWorld ) 且不在原 bbox 内：返回最近边缘投影点。
2. 否则：取 center->refPoint 射线与矩形边界最近交点。

### 6. 几何概要

矩形旋转处理：获取四点 (corner)，视为凸多边形，求 center->ref 射线与各边线段交点取距离最小者。外部 halo 判定：将四点 bbox 扩展 halo 再做包含测试。

### 7. 交互主流程

创建：pointerDown(节点) -> creating -> pointerMove(更新临时线 & hover) -> pointerUp(命中节点? 校验 -> addConnection : 取消)
重连：点击线端点 -> relinking -> pointerMove(动态更新该端) -> pointerUp(验证成功提交/失败回滚)
取消：ESC 或 pointerUp 落空 -> 清理临时对象 -> idle

### 8. 刷新策略

节点 transform 事件把 nodeId 放入 dirtyNodes；若未计划帧刷新则 requestAnimationFrame：

```
for nodeId in dirtyNodes:
	for lineId in nodeLines[nodeId]: invalidate anchors
for lineId invalidated: recompute anchors & update visual
```

### 9. 校验步骤

创建/重连：

1. 自连检查
2. 重复检查 (无向：min(a,b)+max(a,b) key)
3. 外部 onWillCreate / onWillRemove 钩子

### 10. Undo/Redo 预案

Command 结构：{type, lineId, prev, next}
Add: next = {lineData}; undo = remove
Remove: prev = {lineData}; undo = add with same id
Relink: prev = {sourceId,targetId}; next = {...}；undo 还原 prev

### 11. 生命周期

init(): 绑定 pointer / nodeTransform / key(ESC) 事件 & 创建 overlay layer
dispose(): 解绑全部事件, 清理 overlay, 释放临时 line, 清空索引（或保留由外部接管）

### 12. 错误与边界

- 节点已删除：操作前检查 isDeleted(); 不合法则中止
- 重复 add：直接返回 null
- 重连失败：回滚旧端点
- 悬空创建未落点：不生成 line
- 交互状态错乱(并发操作)：进入新状态前统一 cancelInteraction()

### 13. 后续扩展预留

- 多形状：新增 resolver
- 端口：节点暴露 ports[], AnchorResolver 优先匹配最近 port
- 折线/避障：在 updateLineGeometry 中策略分发
- 箭头/标签：LineStyle 增加 arrowStart/arrowEnd/label

### 14. 开发分期（简版）

Phase0: 骨架/索引/接口
Phase1: 基础 add/remove + 节点移动更新
Phase2: 创建交互(临时线 + 吸附)
Phase3: 重连交互
Phase4: 旋转支持 & RAF 合帧
Phase5: Overlay/Handle
Phase6: Undo/Redo Hook
Phase7: 性能/扩展策略

---

> 本文为原始设计的扩展版（V2），后续如需继续细化状态机、算法细节会追加章节。

---

## 锚点与几何算法详化

### 1. 坐标体系与单位换算

- 鼠标事件提供屏幕像素位置 (screenX, screenY)；需转换到画布世界坐标 worldPoint。
- haloPixel：屏幕像素；转换为世界坐标 haloWorld = haloPixel / currentZoom。
- 所有几何计算使用世界坐标；只有在渲染/命中时才与屏幕换算。

### 2. 工具函数签名（Geometry Utils）

```ts
interface Point {
  x: number
  y: number
}
interface Segment {
  a: Point
  b: Point
}

function distance2(a: Point, b: Point): number
function projectPointToSegment(p: Point, seg: Segment): { point: Point; t: number; dist2: number }
function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null // 线段相交(含边界)
function polygonEdges(points: Point[]): Segment[]
function aabbOfPoints(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number }
```

### 3. 矩形表示与旋转

- 旋转矩形通过四个顶点 (p0..p3) 顺时针给出。
- 中心 `C` 可由 `(p0+p2)/2` 求得。
- 未旋转情形可特化优化（直接 axis-aligned 边）。

### 4. 内部中心射线锚点计算 (Center Ray)

输入：`nodeRectCorners[4]`, `center`, `refPoint`
步骤：

1. 方向向量 v = refPoint - center；若 |v| 很小（<epsilon），将 refPoint 沿 x 轴偏移一个最小量 (epsilon=1e-4)。
2. 遍历矩形四条边作为线段，与射线 (center, refPoint) 求交：
   - 使用线段相交，判定交点 t>0。
   - 选择距离 center 最近的交点 (最小 distance2)。
3. 返回该交点；若无交点（理论不应发生），回退到 refPoint。

伪代码：

```ts
function centerRayAnchor(corners: Point[], center: Point, ref: Point): Point {
  let vx = ref.x - center.x,
    vy = ref.y - center.y
  if (Math.abs(vx) + Math.abs(vy) < 1e-6) {
    vx = 1
    vy = 0
  } // fallback
  const edges = polygonEdges(corners)
  let best: { pt: Point; d2: number } | null = null
  for (const e of edges) {
    const pt = lineIntersection(center, { x: center.x + vx, y: center.y + vy }, e.a, e.b)
    if (!pt) continue
    // 检查 pt 在线段范围内，由 lineIntersection 保证
    const d2 = distance2(center, pt)
    if (!best || d2 < best.d2) best = { pt, d2 }
  }
  return best ? best.pt : ref
}
```

### 5. 外部 halo 吸附算法 (Outer Halo Projection)

目标：鼠标位于“扩展外框 - 原框”之间区域或贴近边缘时，返回投影锚点。
步骤：

1. 取得 corners -> axis-aligned AABB：minX,maxX,minY,maxY。
2. 扩展：`minX-haloWorld ... maxX+haloWorld` 等，形成扩展 AABB_ext。
3. 命中条件：cursor 在 AABB_ext 内 且 不在原始 AABB 内（快速预判）；若矩形旋转，则改为点到多边形的点 in/out 测试：
   - 简化：使用点到多边形射线法；或直接用 (centerRayAnchor) 的射线交点并判定距离边界距离 < haloWorld。
4. 获取四条边 segments，对每条边做投影（projectPointToSegment），取 dist2 最小的投影点 projected。
5. 返回 projected.point。

复杂度：O(4) 常数。

### 6. 组合策略 (AnchorResolver.resolve)

输入上下文：`node`, `refPoint`, `haloWorld`, 以及当前 cursor（可能在外部传入）。
伪逻辑：

```ts
if (cursor && isInHalo(node, cursor, haloWorld)) {
  return projectToClosestEdge(cursor)
}
return centerRayAnchor(corners, center, refPoint)
```

### 7. 旋转矩形命中与投影优化

- 若旋转角 == 0（或接近 0）：可使用 axis-aligned 逻辑：
  - 外部吸附：限定 cursor 与边的水平/垂直距离最小。
  - 中心射线：使用矩形宽高直接算交点：
    - 比较参数 t = (±width/2)/vx 与 (±height/2)/vy 获取最小正 t。

### 8. 圆形扩展（未来）

圆心 O，半径 r：

1. 外部吸附：若 r < d <= r+haloWorld 返回 O + (cursor-O).norm \* r。
2. 内部射线：与外吸附公式一致（直接归一）。

### 9. 多边形扩展（未来）

1. 外部吸附：点到各边投影距离 minDist；若 minDist <= haloWorld 则用投影点。
2. 内部射线：centerRayAnchor 已通用。

### 10. 端口 (Ports) 扩展（未来）

- 节点提供 ports[]: Point[]（世界或局部坐标）
- 选择距离 refPoint（或 cursor）最近的 port；若距离 < portSnapThreshold 则直接使用该 port 作为锚点优先级高于边缘。

### 11. 锚点缓存失效策略

失效触发：节点 transform（位置/尺寸/旋转）、重连、更换 line 端点。
策略：

- 在 `lineLinks` 中将 `sourceAnchor/targetAnchor = undefined`。
- 下次 `updateLineGeometry(lineId)` 时重新调用 resolver 并写回缓存。
  可选优化（后期）：帧内多次请求同一 node anchor 可共享中间数据，如 corners 和 center。

### 12. 浮点与边界处理

- epsilon = 1e-6 用于：射线方向零长度、线段相交比较参数范围。
- 投影点若 t<0 则裁剪为端点；若 dist2 极小 (<epsilon) 视为贴合无需动画。
- 极小矩形：宽或高 < epsilon 时退化为线段投影；再小则使用中心点。

### 13. 伪代码：综合锚点求解

```ts
function computeAnchor(
  node: EditorNode,
  refPoint: Point,
  cursor?: Point,
  haloWorld: number,
): Point {
  const shapeType = 'rectangle' // 当前阶段固定
  const corners = node.getCorners()
  const center = node.getCenter()
  // 判断是否外部 halo 吸附
  if (cursor && isInRectangleHalo(cursor, corners, haloWorld)) {
    return projectToClosestEdge(cursor, corners)
  }
  return centerRayAnchor(corners, center, refPoint)
}
```

### 14. 性能注意

- projectToClosestEdge 只对 4 条边迭代无需提前分配数组。
- isInRectangleHalo 可先快速 AABB 剪枝再做精确（旋转时可用点到多边形内测试）。
- 合帧：所有需要重算的 lineId 放入 `dirtyLines`，RAF 中统一执行 `computeAnchor` 与 setPoints。

---

## 事件与生命周期

### 1. 外部事件来源分类

| 类别              | 事件                                                 | 说明                                 |
| ----------------- | ---------------------------------------------------- | ------------------------------------ |
| Pointer           | pointerdown / pointermove / pointerup / pointerleave | 交互主驱动                           |
| Keyboard          | keydown(ESC)                                         | 取消当前交互                         |
| Node              | nodeMove / nodeResize / nodeRotate                   | 节点几何变化（可统一 nodeTransform） |
| Node              | nodeRemoved                                          | 节点被删除（级联清理）               |
| Line (optional)   | lineRemovedExternal                                  | 线被外部系统删除（同步索引）         |
| Canvas            | zoomChanged                                          | 影响 haloWorld 计算                  |
| Editor            | dispose / disable / enable                           | 插件生命周期                         |
| History(optional) | undo / redo(will/did)                                | 交互前清理临时状态                   |

### 2. 内部事件分发

- 使用一个轻量 dispatcher：`on(type, handler)` / `off(type, handler)` / `emit(type, payload)`；
- 插件内部统一通过 handler -> 修改 state -> 标记 dirty -> 调度几何更新；
- 外部（例如其他插件）可订阅：`connection:added`, `connection:removed`, `connection:relinked`。

### 3. 初始化流程 init()

1. 保存 editor 引用与配置 options（合并默认值）
2. 注册外部事件监听（Pointer/Keyboard/Node/Canvas）
3. 创建 overlayLayer（高亮、tempLine、handles）
4. 初始化索引结构：nodeLines, lineLinks
5. 设置内部调度标志：`rafScheduled=false`, `dirtyNodes=Set`, `dirtyLines=Set`
6. 若存在初始数据（可选）加载并批量绘制

### 4. enable()/disable()

enable:

- 若已启用跳过
- 重新绑定 pointer/keyboard（若曾 disable）
- overlayLayer 设为 visible
  disable:
- cancelInteraction()
- 解绑 pointer/keyboard（保留数据，不销毁 line）
- overlayLayer 隐藏

### 5. dispose()

顺序：

1. cancelInteraction()
2. 解绑全部事件（保存 handler 引用用于 off）
3. 销毁 overlayLayer（remove + null 引用）
4. 遍历 lineLinks 销毁所有可视 line（或交给 editor 统一）
5. 清空索引 Map/Set
6. 清空内部调度集合与引用
7. 标记 `disposed=true`，后续 API 调用直接返回或抛出错误（开发模式）

### 6. RAF 调度机制

数据结构：

```
dirtyNodes: Set<NodeId>
dirtyLines: Set<LineId>
rafScheduled: boolean
```

触发：

- nodeTransform: push nodeId -> scheduleRaf()
- relinking / creating 拖拽 pointermove 高频更新：直接在 move 中更新临时线（无需放入 dirtyLines）。
  执行帧：

```
function flush() {
	// 1. 由 dirtyNodes 推导受影响 lineIds
	for (nodeId of dirtyNodes) {
		for (lineId of nodeLines[nodeId]) dirtyLines.add(lineId)
	}
	dirtyNodes.clear()
	// 2. 更新几何
	for (lineId of dirtyLines) updateLineGeometry(lineId)
	dirtyLines.clear()
	rafScheduled=false
}
```

### 7. 事件处理伪代码示例

```ts
function onPointerDown(e) {
  const hit = hitTestNode(e.world)
  if (hit) startCreateFromNode(hit.id, e.world)
  else if (hitHandle(e.world)) startRelink(lineId, end)
}

function onPointerMove(e) {
  if (state.mode === 'creating') updateCreating(e.world)
  else if (state.mode === 'relinking') updateRelinking(e.world)
  else updateHover(e.world)
}

function onPointerUp(e) {
  if (state.mode === 'creating') finishCreating(e.world)
  else if (state.mode === 'relinking') finishRelinking(e.world)
}

function onKeyDown(e) {
  if (e.key === 'Escape') cancelInteraction()
}

function onNodeTransform(node) {
  dirtyNodes.add(node.id)
  scheduleRaf()
}
```

### 8. Undo/Redo 生命周期挂接

- 在执行外部 history 的 `willUndo` / `willRedo` 之前：`cancelInteraction()` 清干扰状态。
- `didUndo` / `didRedo` 后：可选择重新校验索引一致性（开发模式下）。

### 9. 一致性校验（调试模式）

`validateIndexes()`：

1. 对每条 lineLinks 检查 sourceId/targetId 是否存在 nodeLines key。
2. nodeLines 内的 lineId 必须存在于 lineLinks。
3. 报告差异（console.warn）。

### 10. 异常恢复策略

- 若在 flush() 中某条 line 更新抛错：捕获后记录错误，继续其他 line，避免整帧中断。
- 如果多次（>N）对同一 line 抛错，可暂时移入隔离集合并提示开发者。

### 11. 可选扩展事件

`connection:hover:start` / `connection:hover:end` (当光标接近线中点或端点)
`anchor:computed` (调试输出锚点位置)

---

## 性能与优化策略

### 1. 更新路径分析

节点变换 -> 标记 dirtyNodes -> 推导相关 lineIds -> 计算锚点 -> 更新可视对象 (setPoints)。
创建/重连拖拽 -> 高频 pointermove -> 仅更新 1 条临时线或 1 条既有线，无需遍历所有连线。

### 2. RAF 批处理策略

- 单帧内多次 nodeTransform 合并为一次 flush。
- flush 时：

```
collect affected lineIds
dedupe (Set)
for lineId: recompute anchors (lazy) + setPoints
```

- 防止长帧：若 line 数量非常大(>2000)，可分片：每帧处理 N 条（N=500 可配置）。

### 3. 高频 Pointer 事件优化

- creating/relinking 中：只处理当前线，不进入 RAF 队列。
- pointermove 逻辑内做最小工作：
  - 命中测试 -> 缓存结果
  - 计算两个锚点 -> setPoints
- 可选节流：如 pointermove > 120Hz，可用 `if (now - lastUpdate < 8ms) return`，但优先保持流畅不做节流。

### 4. 命中测试加速

初期：线性遍历节点列表（编辑器可能已有优化）。
扩展：引入简单空间索引（QuadTree 或 R-Tree）:

```
insert(nodeId, aabb)
query(point) -> candidate nodeIds
```

只在节点集合变动（添加/删除/尺寸/位置）时更新索引。

### 5. 几何缓存

- 节点层缓存：`cornersCache[nodeId]`, `centerCache[nodeId]`；变换事件失效。
- line 层缓存：`sourceAnchor/targetAnchor`；其任一端节点脏时失效。
- flush 时若 anchor 已存在且端节点未在 dirtyNodes 中，可跳过计算。

### 6. 临时对象与内存

- 重用 Point 对象：内部可维护 `tempPoint` 池，避免频繁 GC（必要时再做）。
- 临时线/handle：初始化时创建，交互中 show/hide 而非反复 new/remove（减少 Layer 重排）。

### 7. 大量连线降级策略（可选）

| 条件             | 策略                               |
| ---------------- | ---------------------------------- |
| line 总数 > 1000 | 禁用实时端点 handle 阴影或复杂样式 |
| line 总数 > 2000 | 禁用 hover 高亮线宽放大            |
| line 总数 > 5000 | 切换到分片刷新 + 锚点结果 LRU 缓存 |

### 8. 锚点计算开销分析

- 每次 anchor: 最多遍历 4 条边 -> 常数时间。
- 旋转多边形后仍是 4 边；不会成为瓶颈。主要成本在命中测试与渲染 batch。

### 9. SetPoints 调用合并

- 可视层若支持批量更新（如 beginBatch()/endBatch()），在 flush 中包裹：

```
beginBatch()
	for lineId update
endBatch()
```

减少中间布局/脏标记开销。

### 10. 视区裁剪（未来）

- 若存在视图窗口，可只更新当前视口内或与 dirty 节点相交的线。
- anchor 计算仍需位置，但 setPoints 渲染可延迟或跳过不在视口内的线（标记需刷新）。

### 11. 诊断与调试

- 性能计数器：

```
stats = { frameAnchors:number, frameLinesUpdated:number, totalLines:number }
```

- 在开发模式（options.debug=true）打印每 60 帧统计；
- 提供 `connector.debugDumpStats()`。

### 12. 失败保护与降级

- flush 超时（单帧 > 16ms）连续 3 次：自动启用分片。
- 分片模式下记录 backlog 行数供调试。

### 13. 空闲回收

- 使用 `requestIdleCallback`（可选）清理长期未使用的缓存（cornersCache 中已经被删除的节点）。

---

## Undo / Redo 集成策略

### 1. Command 抽象

```
interface Command {
	type: 'add-connection' | 'remove-connection' | 'relink-connection'
	do(): void
	undo(): void
	// 可选：merge?(other: Command): boolean
}
```

外部历史栈（editorHistory）负责：push(command)、undo()、redo()。

### 2. 三种命令结构

AddConnectionCommand

```
constructor(linkData: LineLinkLike, plugin: ConnectorPlugin, reuseId?: string)
do(): 创建连接（若 reuseId 则使用原 id）
undo(): 删除该连接
```

RemoveConnectionCommand

```
constructor(lineId: string, snapshot: LineSnapshot, plugin: ConnectorPlugin)
do(): 删除 lineId
undo(): 依据 snapshot 重建（保持原 id）
```

RelinkConnectionCommand

```
constructor(lineId: string, prev: {sourceId:string; targetId:string}, next: {sourceId:string; targetId:string}, plugin: ConnectorPlugin)
do(): 将 lineId 端点设置为 next
undo(): 还原 prev
```

### 3. 快照内容 (LineSnapshot)

```
interface LineSnapshot {
	id: string
	sourceId: string
	targetId: string
	style?: LineStyle
	// 若未来添加更多字段 (label, meta) 统一放入 meta
	meta?: Record<string, any>
}
```

### 4. 插件内部对外暴露用于命令的最小原子 API

```
_createConnectionRaw(data: LineSnapshot, opts:{skipHistory?:boolean}): boolean
_removeConnectionRaw(lineId: string, opts:{skipHistory?:boolean}): LineSnapshot | null
_relinkConnectionRaw(lineId: string, next:{sourceId:string; targetId:string}, opts:{skipHistory?:boolean}): boolean
```

说明：公开 addConnection()/removeConnection()/relinkConnection() 作为带历史集成封装；Raw 版本不写入历史栈。

### 5. 与交互的耦合点

- 创建交互成功 -> 构造 AddConnectionCommand -> push
- 重连提交成功 -> 构造 RelinkConnectionCommand -> push
- 用户 UI 删除 -> 构造 RemoveConnectionCommand -> push
- 在 push 前调用 `cancelInteraction()` 保证无临时状态。

### 6. Undo/Redo 流程示例

用户拖拽创建成功：

1. 插件 addConnectionRaw -> 得到 snapshot
2. 构建 AddConnectionCommand 并 push
   用户撤销：历史栈调用 command.undo() -> 插件 removeConnectionRaw
   用户重做：command.do() -> 重新 create（保持同 id）

### 7. 命令合并策略（当前不启用）

- 重连连续快速操作可考虑合并（只保留最初 prev 与最终 next）
- 合并检测：新命令与栈顶同类型 = relink 且 lineId 相同 -> 更新栈顶 next 返回 true
- 初版为了简单与可调试性：`merge` 返回 false。

### 8. 错误与回滚

在 do()/undo() 中任何一步失败：

1. 记录错误（console.error）
2. 尝试执行逆操作保持一致性（最佳努力）
3. 抛出或返回失败供历史栈决定是否中止链。

### 9. 一致性校验钩子

- 开发模式：每次 do()/undo() 后调用 `validateIndexes()`；失败打印警告。

### 10. 性能注意

- 复用 snapshot 对象：撤销后重做不必重新查询节点，只需确认节点仍存在；若节点已被外部删除，redo 可失败并在历史栈中标记命令不可重做。
- 连接的样式大对象可 shallow copy；大量连线撤销可考虑结构化克隆缓存池。

### 11. 与外部系统协作

- 若编辑器已有统一 Command 接口：实现适配器包装内部命令使其满足外部签名。
- 若外部支持事务（batch command），可在批量操作前禁用自动 push，聚合后一次 push 一个复合命令。

---

## 错误与边界处理

### 1. 异常/边界场景矩阵

| 场景                  | 触发                     | 后果           | 处理策略                           |
| --------------------- | ------------------------ | -------------- | ---------------------------------- |
| 自连尝试              | 创建/重连 source==target | 非法连接       | 拦截返回 null / 不提交命令         |
| 重复连接              | 已存在 (A,B) 再次创建    | 数据重复       | 拦截返回 null                      |
| 节点缺失              | 传入不存在或已删除节点   | 无法建立或更新 | 立即终止，warn                     |
| 线缺失                | 重连或删除时 line 不存在 | 索引不一致     | warn + 返回 false                  |
| 锚点计算失败          | 几何异常 / NaN           | 连线跳变       | 使用后备点(refPoint)并 error 记录  |
| 浮点抖动              | 高频微小 transform       | 线端 jitter    | anchor 距离中心<epsilon 则跳过更新 |
| 交互状态错乱          | 并发 pointerdown         | 临时残留       | cancelInteraction() 再进入新状态   |
| Undo 目标缺失         | redo 时节点被外部删除    | 无法恢复       | 标记命令失效，warn                 |
| 分片刷新 backlog 堆积 | 大量节点频繁移动         | 延迟显示       | 动态提升每帧处理上限或降级特效     |
| 外部强删 line 未通知  | 外部系统绕过 API         | 泄漏引用       | validateIndexes 清理孤儿数据       |
| 大量快速重连          | 用户快速拖动端点         | 命令洪泛       | 可合并（后期）或限制频率           |

### 2. 防御式编程顺序（创建连接）

1. 校验节点存在 & 未删除
2. 自连判定 & 配置 allowSelfConnection
3. 重复连线判定 & allowDuplicate
4. 外部钩子 onWillCreate（若 false 中止）
5. 构建 LineLink & 写入索引（使用 try/finally）
6. 创建可视对象；失败则回滚索引

### 3. 原子更新与回滚

重连：

```
backup = {sourceId, targetId}
try {
	update nodeLines remove old
	update link endpoints
	add new nodeLines ref
} catch(e) {
	// 回滚
	restore backup
	re-register old indexes
	throw e
}
```

### 4. 错误分级与日志

| 级别  | 示例                           | 行为               |
| ----- | ------------------------------ | ------------------ |
| debug | 每帧 stats                     | debug 开关时输出   |
| info  | 创建/删除连接（可选）          | 可配置是否输出     |
| warn  | 重复创建、缺失节点、线已不存在 | 继续运行           |
| error | 回滚失败、锚点 NaN             | 输出并标记统计计数 |

### 5. 数据一致性修复

`rebuildIndexes()`（开发工具）:

1. 从 lineLinks 重新遍历构造 nodeLines
2. 检测 lineLinks 中引用节点不存在：移除该 line -> 记录孤儿
3. 输出修复报告

### 6. 交互取消的幂等性

`cancelInteraction()` 可被重复调用；内部需：

- 若 tempLine 存在 -> remove() & null
- 若 relinking -> 回滚（若尚未提交）
- 清空 state 字段 -> 置 mode='idle'
  保证无副作用。

### 7. 性能超时保护

flush 开始记录 `t0`; 若 (performance.now()-t0)> frameBudget(12~14ms):

- 终止剩余 line 处理，把未处理 lineId 留在 dirtyLines 供下一帧
- 设置 `degradedMode=true`
- 在 debug 输出提示

### 8. 配置安全默认值

options 默认：

```
allowSelfConnection: false
allowDuplicate: false
haloPixel: 8
batchRAF: true
dragThreshold: 3
```

缺失时补齐，防止 undefined 判断分支错误。

### 9. Undo/Redo 冲突

- 在 command.do()/undo() 之前强制 `cancelInteraction()`
- 若命令目标缺失则命令标记为失效：`command.disabled=true`
- 历史栈 redo 时遇到 disabled 命令：跳过并继续下一条或停止（策略可配置）

### 10. 诊断辅助 API

```
connector.validateIndexes() // 返回 { orphanLines:number, missingNodes:number }
connector.debugDumpStats()  // 返回统计数据
connector.rebuildIndexes()  // 尝试修复
```

### 11. Epsilon 与数值稳定

统一常量：

```
const EPS = 1e-6
```

用于：长度为 0、比较浮点接近、避免除 0。

---

## 阶段化实施步骤与验收标准

### 概览

| Phase | 目标              | 关键产出                      | 依赖    | 验收标准                                          |
| ----- | ----------------- | ----------------------------- | ------- | ------------------------------------------------- |
| 0     | 骨架与基础索引    | 类骨架、数据结构、简单日志    | 无      | 能创建/销毁插件实例，不报错；debugDump() 输出结构 |
| 1     | 基础连线增删      | add/remove raw & 可视线       | Phase0  | 手动调用 API 新增/删除线，索引一致，线条显示正确  |
| 2     | 拖拽创建交互      | creating 状态 + 临时线 + 吸附 | P1 几何 | 鼠标拖拽两节点间创建线，自连/重复被拒绝           |
| 3     | 重连端点交互      | relinking 状态                | P2      | 拖拽端点重连到新节点；失败回滚                    |
| 4     | 节点变换联动      | RAF 批更新                    | P1      | 移动/缩放/旋转节点，相关线实时更新且无抖动        |
| 5     | Overlay & Handles | 高亮、端点 handle             | P3      | 创建/重连时节点高亮，选中线显示端点圆点           |
| 6     | Undo/Redo 集成    | 三类命令                      | P1-P5   | 创建/删除/重连均可撤销重做一致                    |
| 7     | 性能与扩展        | 缓存/分片/调试统计            | 全部    | 1000 线测试流畅；stats 可输出；可开关降级         |
| 8     | 清理与文档        | 最终文档/重构                 | 全部    | 代码风格统一， design.md 与实现一致               |

### Phase 0: 骨架 / 接口

任务：

1. 建立 `ConnectorPlugin` 主类文件
2. 定义接口 / 选项默认值 / 索引 Map 初始化
3. 提供 debugDump / dispose 空实现
   验收：实例化与销毁不抛异常；`debugDump()` 返回空结构。

### Phase 1: 基础连线增删

任务：

1. 实现 `_createConnectionRaw` / `_removeConnectionRaw`
2. 创建直线可视对象（简化样式）
3. 维护 nodeLines / lineLinks 一致性
4. 提供 `addConnection` / `removeConnection`
   验收：重复添加拒绝；删除后索引清空；线对象被移除。

### Phase 2: 拖拽创建

任务：

1. pointer 事件绑定 + creating 状态
2. dragThreshold 逻辑 + 临时线
3. 吸附与锚点计算调用几何模块
4. 校验 + 提交 + 取消处理
   验收：拖拽成功生成线；ESC 取消无残留；快速拖动不抖动。

### Phase 3: 重连交互

任务：

1. 端点 handle 命中测试（简单圆形包围盒）
2. relinking 状态 + 回滚逻辑
3. 校验重复/自连
   验收：端点成功换节点；无效目标回滚；状态机健壮。

### Phase 4: 节点变换联动

任务：

1. 监听 nodeTransform
2. dirtyNodes -> dirtyLines -> RAF flush
3. 失效 anchor 缓存
   验收：连续拖拽节点线端跟随；多节点同时变换无掉帧明显 (>55fps)。

### Phase 5: Overlay & Handles

任务：

1. overlayLayer 创建与 show/hide
2. 节点 hover 高亮矩形（可视化 halo）
3. 端点 handle 样式与交互反馈（hover 放大）
   验收：只在需要时渲染；隐藏/取消后清理干净。

### Phase 6: Undo / Redo

任务：

1. 三种 Command 实现
2. add/remove/relink 封装历史写入
3. cancelInteraction 前置于命令执行
4. 失败回滚 & validateIndexes 调试
   验收：创建->撤销->重做 成功；重连也同理；无孤儿 line。

### Phase 7: 性能 & 扩展

任务：

1. 统计数据收集 stats
2. 分片刷新与降级开关
3. 锚点与 corners 缓存
4. (可选) QuadTree 原型
   验收：模拟 1000 连线操作流畅；分片模式触发条件验证。

### Phase 8: 清理与文档

任务：

1. 代码重构（模块拆分，命名统一）
2. 添加 JSDoc & README snippet
3. 更新 design.md 与实际实现差异
4. 列出下一阶段（端口、多形状、折线） backlog
   验收：文档与实现完全对应；无未使用文件；lint 通过。

### 里程碑检查清单 (实时)

```
[x] P0 完成骨架
[x] P1 直连增删
[x] P2 拖拽创建 + 基础锚点(中心) 已接入
[ ] P3 重连交互
[ ] P4 变换联动 (RAF 刷新/锚点缓存失效)
[ ] P5 Overlay/Handles (端点句柄/hover 高亮)
[ ] P6 Undo/Redo (命令模式集成)
[ ] P7 性能优化 (分片/统计/降级)
[ ] P8 文档收官
```

### Phase3 实施细化：重连交互 (Relinking)

目标：支持用户点击既有连线端点(显示 handle)后拖拽到新节点以更改 source 或 target。

新增/调整数据结构：

```
InteractionState {
	...
	mode: 'idle' | 'creating' | 'relinking'
	relinkingLineId?: string
	relinkingEnd?: 'source' | 'target'
	relinkBackup?: { sourceId: string; targetId: string }
}
```

Handle 表示：

```
interface EndpointHandle { id: string; lineId: string; end: 'source'|'target'; ui: IUI; }
handles: Map<string, EndpointHandle>
```

关键函数：

```
showLineHandles(lineId) -> 创建/更新两个端点 handle (若 overlay 存在重用)
hideLineHandles(lineId?) -> 隐藏特定或全部
hitTestHandle(point) -> {lineId,end}|undefined // 圆形半径=6~8px in world
startRelink(lineId,end)
updateRelink(cursorPoint)
commitRelink(targetNodeId)
rollbackRelink()
```

流程：

1. pointerdown 命中 handle -> startRelink: 保存备份, 进入 relinking
2. pointermove -> 实时更新该端 anchor = computeNodeAnchor(另一端节点, cursor) (refPoint 取对端 anchor)
3. pointerup -> 若命中新节点且合法 -> commitRelink; 否则 rollbackRelink
4. ESC -> rollbackRelink

锚点更新策略：重连过程中只改变拖拽那一端点几何，不写回缓存；提交后写入 link.sourceAnchor/targetAnchor。

### Phase4 实施细化：节点变换联动 & RAF 刷新

新增内部集合：

```
dirtyNodes: Set<NodeId>
dirtyLines: Set<LineId>
rafScheduled: boolean
```

新增方法：

```
markNodeDirty(nodeId)
scheduleFlush()
flush() // 在 requestAnimationFrame 中执行
updateLineGeometry(lineId) // 读取 link / anchors -> 若失效重新 computeAnchors
invalidateLineAnchors(lineId) // 清除 link.sourceAnchor / targetAnchor
```

节点变换事件（需与外部编辑器整合）：移动/缩放/旋转 -> markNodeDirty(nodeId)。
在 flush 中：

1. 聚合 dirtyNodes => for 每条相关 lineId -> dirtyLines.add
2. 对 dirtyLines 调用 updateLineGeometry
3. 统计性能 (frameLinesUpdated, frameAnchors)

锚点失效：当节点进入 dirtyNodes 列表时，相关 line 的对应端 anchor 置 undefined。

### Phase5 实施细化：Overlay & Handles

Overlay 组成：

```
overlayLayer: IUI(Group)
highlightRect?: IUI // 节点 hover 或 active 高亮
tempLine: 复用创建时的临时线（已存在）
endpointHandles: Map<string, EndpointHandle>
```

职责：

- 高亮节点轮廓 (使用矩形 + 半透明填充/描边)
- 显示端点 handle（小圆点）
- 显示临时线 / 重连预览线

API：

```
ensureOverlayLayer()
showNodeHighlight(nodeId)
hideNodeHighlight()
ensureEndpointHandle(lineId, end)
positionEndpointHandle(handle, point)
updateAllHandles(lineId?) // 节点变换后刷新端点位置
```

### Phase6 实施细化：Undo / Redo 命令模式

内部历史栈（若外部无）：

```
history: Command[]; pointer = -1
push(cmd)
undo()
redo()
```

命令接口：

```
interface Command { do(): boolean; undo(): boolean }
```

命令对象：AddConnectionCommand / RemoveConnectionCommand / RelinkConnectionCommand。

公共 API 行为：

```
addConnection(...) -> 若 enableHistory: 通过命令封装 => push
removeConnection(lineId) -> 同理
relinkConnection(lineId,newSource,newTarget) -> 命令
```

Raw 方法（不入历史）：`_createConnectionRaw`, `_removeConnectionRaw`, `_relinkConnectionRaw`。

失败回滚：命令执行失败返回 false，历史栈不移动 pointer。

### Phase7 实施细化：性能 / 缓存 / 降级

新增统计：

```
stats: { totalLines, creates, removes, errors, frameAnchors, frameLinesUpdated, degradedMode }
```

在 flush() 前置 `startFrame = performance.now()`，结束计算耗时：

```
if (elapsed > 14 && dirtyLines.size>0) { degradedMode=true; 分片: 处理前 N 条后 scheduleFlush() 继续 }
```

降级策略开关：`options.degradeThresholds = { anchors:1000, lines:2000 }`（可选）。
当 totalLines 超阈值：

1. 禁用 hover 高亮 (skip showNodeHighlight)
2. handle 样式简化 (减少阴影)

缓存：

```
cornersCache: Map<NodeId, Point[4]>
centerCache: Map<NodeId, Point>
invalidateNodeCache(nodeId)
```

节点变换时同时失效 corners 与 center；计算 anchor 时若缓存缺失则重建。

### 综合实施顺序（Phase3-7）

1. P3 重连交互（数据 & 状态 & 基本 handle）
2. P4 RAF 刷新与节点变换联动（不含优化缓存）
3. P5 Overlay 细化（高亮 + 句柄复用 + hover）
4. P6 命令模式 & 历史栈（整合创建/删除/重连）
5. P7 性能与缓存（corners/center 缓存 + 分片 + 降级）

后续可以在 P8 统一文档同步与清理。

### 风险与缓解

| 风险                 | 阶段  | 缓解                             |
| -------------------- | ----- | -------------------------------- |
| 事件系统不一致       | P2    | 先写适配层，封装 editor 事件     |
| 命中测试性能差       | P2-P3 | 简单 bbox + 早期返回；后期再索引 |
| 变换频率过高导致卡顿 | P4    | 分片刷新与跳帧策略               |
| 撤销与交互竞态       | P6    | 全局 cancelInteraction 守卫      |
| 大量连线渲染抖动     | P7    | 合批 + 降级关闭高亮              |

---

## 扩展 Backlog & 版本说明

### Backlog（优先级从高到低）

1. 端口 (Ports) 支持（节点可定义固定锚点集合）
2. 多形状 AnchorResolver（圆、菱形、多边形）
3. 方向箭头与线条样式扩展（箭头、虚线模式组合）
4. 折线路由（Manhattan / Orthogonal）与避障
5. 自动重新布局（节点批量移动后路径重算）
6. 线标签与富文本（中点、跟随）
7. 多条平行连线（多关系）分离（偏移/曲率）
8. 空间索引（QuadTree）命中加速正式化
9. 命令合并（连续重连合并为 1 条历史记录）
10. 批量选择与批量删除/撤销

### 未来技术性改进

- 路径缓存与增量更新（只更新移动端点的线段部分）
- Web Worker 计算复杂路由（避免主线程阻塞）
- 性能监控面板（可视化统计）

### 版本说明

当前文档：Design V1.0（满足基础直线连接功能 + Undo/Redo + 性能优化策略预案）
后续版本：

- V1.1 计划：端口 + 圆/多边形 Resolver
- V1.2 计划：折线/避障 + 箭头 + 标签
- V1.3 计划：并行线路布局 + Worker 路由实验

### 文档维护策略

- 每次实现超出当前章节范围的新功能时，新增“变更日志（Changelog）”章节并标注日期。
- 所有新增公共 API 在 “关键接口” 区域补充条目并附最小使用示例。

---

## 交互状态机（FSM）细化

### 状态集合（精简）

`idle` | `creating` | `relinking`

附加属性（不独立成主状态）：`hoverNodeId`, `hasDragged`，临时线 `tempLine`。

### 状态字段

```
InteractionState {
	mode: 'idle' | 'creating' | 'relinking'
	creatingFromNodeId?: string
	tempLine?: VisualLine
	activeLineId?: string        // relinking 的目标 line
	relinkingEnd?: 'source' | 'target'
	hoverNodeId?: string
	hasDragged?: boolean
	lastCursor?: Point
}
```

### 主要事件

pointerdown / pointermove / pointerup / keydown(ESC) / nodeTransform / nodeRemoved / zoomChanged

### 迁移规则

| 当前      | 事件        | 条件                    | 下一个    | 动作                             |
| --------- | ----------- | ----------------------- | --------- | -------------------------------- |
| idle      | pointerdown | 命中节点                | creating  | 记录 creatingFromNodeId          |
| creating  | pointermove | 距离 > 阈值 & !tempLine | creating  | 创建 tempLine, hasDragged=true   |
| creating  | pointermove | hasDragged              | creating  | 更新 tempLine 终点 & hover       |
| creating  | pointerup   | hasDragged & hover 合法 | idle      | 校验+addConnection 销毁 tempLine |
| creating  | pointerup   | hasDragged & 不合法     | idle      | 取消销毁 tempLine                |
| creating  | pointerup   | !hasDragged             | idle      | 视为点击无操作                   |
| creating  | ESC         | -                       | idle      | 取消销毁 tempLine                |
| idle      | pointerdown | 命中线端点 handle       | relinking | 记录 lineId + relinkingEnd       |
| relinking | pointermove | -                       | relinking | 动态更新该端点位置               |
| relinking | pointerup   | hover 合法              | idle      | 校验 + relink 提交               |
| relinking | pointerup   | hover 不合法            | idle      | 回滚                             |
| relinking | ESC         | -                       | idle      | 回滚                             |

### 关键动作描述

- 创建临时线：使用起点锚点与当前鼠标点/吸附锚点，以半透明样式。
- 更新临时线：命中测试 -> 计算吸附锚点 -> setPoints。
- 提交创建：通过校验 -> addConnection -> 回收临时资源。
- 开始重连：记录原 source/target 以便失败回滚。
- 重连更新：实时修改 line 几何（可不立即更新索引）。
- 提交重连：更新 lineLinks 及 nodeLines；失效 anchor 缓存。
- 回滚重连：恢复旧端点几何。
- 取消交互：统一调用 cancelInteraction()，保证状态收敛。

### Hover 判定

pointermove 中执行命中：若命中节点且不等于起始节点则记为 hoverNodeId；变化时刷新高亮 overlay。

### 防御措施

- 并发 pointerdown：先 cancel 再进入新状态。
- pointerup 丢序（mode 与事件不匹配）直接忽略。
- 重连过程中 line 被外部删除：检测不到 line -> cancel -> idle。

### 参数可配置

- dragThreshold (默认 3px)
- haloPixel (默认 8px)
- allowSelfConnection / allowDuplicate

---
