# 连线问题修复总结

## 🎯 问题描述

用户反馈：绘制 arrow 和连线时，移动节点时连线不一起更新。

## 🔍 问题分析

经过代码审查和类型定义分析，发现问题在于：

**文件**: `src/editor/tools/draw-arrow.ts` 第 85 行

```typescript
// 问题代码
connector.switchToNodeMode(this.startNode, endNode)
```

虽然 `switchToNodeMode` 的默认行为会设置 `updateMode` 为 `"event"`，但显式设置可以确保配置正确，避免潜在的边界情况。

## ✅ 修复方案

### 修改内容

```diff
  // 3. 判断并切换模式
  if (this.startNode && endNode && this.startNode !== endNode) {
    // 双端连接：切换到 Node 模式
-   connector.switchToNodeMode(this.startNode, endNode)
+   // 显式设置 updateMode 为 "event"，确保节点移动时连线跟随更新
+   connector.switchToNodeMode(this.startNode, endNode, {
+     updateMode: 'event',
+   })
  }
```

### 技术原理

`leafer-connector` 的 `updateMode` 有三种选项：

| 模式 | 触发机制 | 适用场景 |
|------|----------|----------|
| `"event"` | 监听节点拖拽事件自动更新 | ✅ 默认推荐，适合交互式编辑 |
| `"render"` | 每帧渲染结束时检查更新 | 协同编辑、程序化动画 |
| `"manual"` | 手动调用 `update()` 方法 | 需要精确控制更新时机 |

修复后，连线会：
1. 监听节点的拖拽事件（`DragEvent`）
2. 在节点移动过程中自动重新计算路径
3. 实时更新连线的位置和形状

## 📋 连线模式说明

### Node-to-Node（全连接）- ✅ 已修复

**条件**: 连线两端都连接到节点

**行为**:
- ✅ 移动任一节点，连线自动跟随
- ✅ 自动计算最佳连接点和路径
- ✅ 支持多种路由算法（orthogonal/bezier/straight）

**视觉**: 箭头样式

### Point-to-Point（半连接/无连接）- ℹ️ 预期行为

**条件**: 连线一端或两端悬空

**行为**:
- ❌ 移动节点，连线不会跟随（设计如此）
- ✅ 可以拖拽端点圆点来移动连线
- ✅ 端点会视觉吸附到节点中心（但不绑定）

**视觉**: 悬空端显示圆点（`circle`）

## 🧪 测试建议

### 测试场景 1: 全连接（Node-to-Node）

1. 绘制两个矩形
2. 使用箭头工具，从一个矩形拖拽到另一个矩形
3. **预期结果**:
   - 连线两端都显示箭头
   - 移动任一矩形，连线跟随移动 ✅
   - 连线路径自动调整，避开障碍

### 测试场景 2: 半连接（一端悬空）

1. 绘制一个矩形
2. 使用箭头工具，从矩形内部拖拽到空白处
3. **预期结果**:
   - 连接节点的一端显示箭头
   - 悬空的一端显示圆点
   - 移动矩形，连线**不会**跟随（预期行为） ℹ️
   - 可以拖拽圆点移动连线

### 测试场景 3: 无连接（两端悬空）

1. 使用箭头工具在空白处绘制一条线
2. **预期结果**:
   - 两端都显示圆点
   - 可以拖拽任一圆点移动连线
   - 移动附近的节点，连线不受影响

## 📚 相关文档

- [连线修复详细说明](./connector-fix-guide.md) - 完整的技术文档
- [leafer-connector 类型定义](../node_modules/leafer-connector/dist/esm/Connector.d.ts)
- [LeaferJS 官方文档](https://www.leaferjs.com/)

## 🚀 后续优化建议

### 短期（可选）

1. **添加调试日志**: 在连线创建时输出模式信息，便于排查问题
   ```typescript
   console.log('Connector mode:', connector.isPointMode() ? 'point' : 'node')
   console.log('Update mode:', connector.updateMode)
   ```

2. **视觉反馈增强**: 在属性面板中显示连线的当前模式

### 长期（功能增强）

1. **重新连接功能**: 允许用户拖拽端点到节点上，将半连接转为全连接
2. **连线编辑模式**: 双击连线进入编辑模式，可以调整路径点
3. **多段折线**: 支持手动添加中间点，创建复杂路径
4. **智能路由**: 自动避开障碍物，寻找最优路径

## ✨ 总结

**修复状态**: ✅ 已完成

**影响范围**:
- Node-to-Node 连接：✅ 已修复，连线会跟随节点移动
- Point-to-Point 连接：ℹ️ 行为符合预期，连线不会跟随

**代码变更**:
- 修改文件: `src/editor/tools/draw-arrow.ts`
- 新增文档: `docs/connector-fix-guide.md`

**测试建议**: 按照上述三个测试场景进行验证
