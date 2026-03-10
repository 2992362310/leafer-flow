# 连线（Connector）修复说明

## 问题描述

用户反馈：绘制 arrow 和连线时，移动节点时连线不一起更新。

## 根本原因

在 `draw-arrow.ts` 中调用 `switchToNodeMode` 时，没有显式设置 `updateMode` 参数。虽然默认值应该是 `"event"`，但显式设置可以确保连线正确绑定到节点并响应移动事件。

## 修复内容

### 1. 显式设置 `updateMode`

**修改文件**: `src/editor/tools/draw-arrow.ts`

```typescript
// 修改前
connector.switchToNodeMode(this.startNode, endNode)

// 修改后
connector.switchToNodeMode(this.startNode, endNode, {
  updateMode: 'event',
})
```

### 2. `updateMode` 的工作原理

根据 `leafer-connector` 的类型定义：

```typescript
/**
 * 自动更新模式
 * - event: 仅 DragEvent + 交互触发 update（默认）
 * - render: 每帧 RenderEvent.END 调用 update（适合协同/程序频繁改坐标）
 * - manual: 完全手动（你需要自己调用 connector.update()）
 */
updateMode?: "event" | "render" | "manual";
```

**三种模式的区别**：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `event` | 监听节点的拖拽事件，自动更新连线 | 默认模式，适合大多数场景 |
| `render` | 每帧渲染结束时检查更新 | 协同编辑或程序频繁改变坐标 |
| `manual` | 完全手动调用 `connector.update()` | 需要精确控制更新时机的场景 |

## 连线的两种模式

### Node-to-Node 模式（全连接）

**触发条件**: 连线的两端都连接到了图形节点

**特点**:
- ✅ 移动任一节点，连线会自动跟随
- ✅ 自动计算最佳路径和连接点
- ✅ 支持路由算法（orthogonal、bezier、straight）

**代码示例**:
```typescript
// 当两端都有节点时，自动切换到 Node 模式
if (startNode && endNode && startNode !== endNode) {
  connector.switchToNodeMode(startNode, endNode, {
    updateMode: 'event',
  })
}
```

### Point-to-Point 模式（半连接或无连接）

**触发条件**: 连线的一端或两端没有连接到节点（悬空）

**特点**:
- ❌ 移动节点时，连线**不会**跟随
- ✅ 可以通过拖拽端点（handle）来移动连线
- ✅ 端点会自动吸附到节点中心（但不建立绑定关系）

**代码示例**:
```typescript
// Point 模式下，只是改变坐标，不绑定节点
let fromPoint = { x: 100, y: 100 }
let toPoint = { x: 300, y: 300 }

if (startNode) {
  // 吸附到节点中心
  const bounds = startNode.getBounds('box', 'page')
  fromPoint = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

connector.setPoints(fromPoint, toPoint)
```

## 视觉反馈

为了区分两种模式，代码中添加了不同的箭头样式：

| 场景 | 起点箭头 | 终点箭头 | 说明 |
|------|----------|----------|------|
| 全连接（Node-to-Node） | 无 | `arrow` | 标准箭头 |
| 半连接（起点悬空） | `circle` | `arrow` | 圆点标记悬空端 |
| 半连接（终点悬空） | 无 | `circle` | 圆点标记悬空端 |
| 无连接（两端悬空） | `circle` | `circle` | 双圆点标记 |

## 测试步骤

### 测试 Node-to-Node 模式

1. 绘制一个矩形（Rect）
2. 绘制另一个矩形
3. 选择箭头工具，从第一个矩形拖拽到第二个矩形
4. **验证**: 移动任一矩形，连线应该跟随移动

### 测试 Point-to-Point 模式

1. 选择箭头工具
2. 在空白处拖拽绘制一条线（不连接任何节点）
3. **验证**:
   - 两端显示圆点
   - 可以拖拽圆点移动连线
   - 移动附近的节点，连线不会跟随

### 测试半连接模式

1. 绘制一个矩形
2. 选择箭头工具，从矩形内部拖拽到空白处
3. **验证**:
   - 连接节点的一端显示箭头
   - 悬空的一端显示圆点
   - 移动矩形时，连线不会跟随（因为不是全连接）

## 常见问题

### Q: 为什么半连接模式下，移动节点连线不跟随？

**A**: 这是设计如此。半连接本质上仍然是 Point 模式，只是视觉上将端点吸附到了节点中心，但并没有建立真正的绑定关系。

### Q: 如何让半连接变成全连接？

**A**: 目前需要重新绘制连线。未来可以添加"重新连接"功能，允许用户拖拽端点到另一个节点上。

### Q: 连线更新有延迟怎么办？

**A**: 尝试将 `updateMode` 改为 `"render"`：

```typescript
connector.switchToNodeMode(startNode, endNode, {
  updateMode: 'render',
  renderThrottleMs: 16, // 约 60fps
})
```

### Q: 如何手动触发连线更新？

**A**: 调用 `connector.update()` 方法：

```typescript
connector.updateMode = 'manual'
// ... 修改节点位置
connector.update()
```

## 相关文件

- `src/editor/tools/draw-arrow.ts` - 箭头/连线绘制工具
- `node_modules/leafer-connector/dist/esm/Connector.d.ts` - 类型定义
- `node_modules/leafer-connector/dist/esm/types.d.ts` - 配置选项类型

## 参考资料

- [LeaferJS 官方文档](https://www.leaferjs.com/)
- [leafer-connector GitHub](https://github.com/leaferjs/leafer-connector)
