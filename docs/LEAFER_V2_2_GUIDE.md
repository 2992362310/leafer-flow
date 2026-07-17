# LeafJS v2.2.2 新功能集成指南

## 📋 概述

本文档介绍了 LeafJS v2.2.2 新增的三个功能在 leafer-flow 项目中的集成和使用方式。

| 功能               | 文件                       | 作用                                        |
| ------------------ | -------------------------- | ------------------------------------------- |
| **hitThrough**     | `leafer-v2-2-features.ts`  | 穿透选择 - 允许点击穿透某些元素选中下层元素 |
| **forceUpdate()**  | `editor-force-update.ts`   | 强制更新优化 - 三种更新模式优化性能         |
| **motionVertical** | `connector-motion-path.ts` | 运动路径垂直对齐 - 支持竖向路径排列         |

---

## 🎯 功能 1: hitThrough - 穿透选择

### 场景

在编辑器中，某些图层（如导出图层、辅助线层）可能位于形状上方。当用户点击这些图层时，应该能够穿透它们选中下方的实际形状。

### 核心概念

```typescript
element.hitThrough = true; // 启用穿透，允许点击穿透此元素
element.hitThrough = false; // 禁用穿透（默认）
```

### 使用示例

#### 示例 1: 为单个图层启用穿透

```typescript
import { applyHitThrough } from "@/editor/core/leafer-v2-2-export";

// 在组件中或编辑器初始化时
const overlayLayer = editor.app.tree.children?.[0];
applyHitThrough(overlayLayer, {
  enabled: true,
  throughTags: ["overlay", "guide"],
});
```

#### 示例 2: 使用图层管理器（推荐）

```typescript
import { createDefaultLayerHitThroughManager } from "@/editor/core/leafer-v2-2-export";

// 初始化管理器
const layerManager = createDefaultLayerHitThroughManager();

// 为特定图层启用穿透
layerManager.enableLayerHitThrough(guideLayer, "guide");

// 判断是否已启用
if (layerManager.isHitThroughEnabled(layer)) {
  console.log("此图层已启用穿透选择");
}

// 切换穿透状态
layerManager.toggleLayerHitThrough(layer, "overlay");

// 批量启用
layerManager.enableBatchLayerHitThrough([layer1, layer2], "guide");
```

### 在 LayerPanel 中集成

```vue
<template>
  <!-- 在图层项目上添加穿透选择切换按钮 -->
  <button @click="toggleHitThrough(layerItem)">
    {{ layerManager.isHitThroughEnabled(layerItem) ? "禁用穿透" : "启用穿透" }}
  </button>
</template>

<script setup lang="ts">
import { createDefaultLayerHitThroughManager } from "@/editor/core/leafer-v2-2-export";

const layerManager = createDefaultLayerHitThroughManager();

const toggleHitThrough = (layer) => {
  layerManager.toggleLayerHitThrough(layer, "overlay");
};
</script>
```

---

## ⚡ 功能 2: forceUpdate() 增强 - 性能优化

### 场景

在大量元素进行更新时（对齐、分布、样式修改等），使用特定的更新类型可以避免不必要的属性变化事件派发，从而提升性能。

### 三种更新模式

| 更新类型   | 说明                           | 适用场景                   |
| ---------- | ------------------------------ | -------------------------- |
| `'render'` | 仅渲染更新，不触发属性变化事件 | 改变颜色、透明度等外观属性 |
| `'layout'` | 仅布局更新，不触发属性变化事件 | 对齐、分布、缩放等几何变换 |
| `'style'`  | 仅样式更新                     | 单纯的CSS样式修改          |
| `'all'`    | 完整更新（传统方式）           | 需要完整重新渲染时使用     |

### 使用示例

#### 示例 1: 单个元素更新

```typescript
import { forceElementUpdate } from "@/editor/core/leafer-v2-2-export";

// 仅渲染更新
forceElementUpdate(element, "render");

// 仅布局更新
forceElementUpdate(element, "layout");

// 仅样式更新
forceElementUpdate(element, "style");
```

#### 示例 2: 批量元素更新

```typescript
import { forceElementUpdateBatch } from "@/editor/core/leafer-v2-2-export";

// 对齐操作：使用布局更新
forceElementUpdateBatch(selectedElements, "layout");

// 样式面板修改：使用样式更新
forceElementUpdateBatch(styledElements, "style");

// 选中操作：使用渲染更新
forceElementUpdateBatch(selectedElements, "render");
```

#### 示例 3: 使用编辑器管理器（推荐）

```typescript
import { createDefaultEditorUpdateManager } from "@/editor/core/leafer-v2-2-export";

// 初始化管理器
const updateManager = createDefaultEditorUpdateManager(editor);

// 执行优化更新
updateManager.updateElements(selectedElements, "layout");

// 获取性能指标
const metrics = updateManager.getPerformanceMetrics();
console.log("优化率:", metrics.optimizationRate * 100, "%");

// 打印性能报告
updateManager.printPerformanceReport();
```

#### 示例 4: 队列化批量更新（减少重排）

```typescript
const updateManager = createDefaultEditorUpdateManager(editor);

// 把更新加入队列，在下一帧批量执行
for (const element of elements) {
  updateManager.queueUpdate(element, "render");
}
// 所有更新会在下一帧执行，避免多次重排
```

### 在编辑器操作中集成

#### 对齐操作优化

```typescript
// src/editor/action/do-align.ts
import { optimizeTransformUpdate } from "@/editor/core/leafer-v2-2-export";

export function doAlign(editor: Editor, direction: string) {
  const selected = editor.app.editor?.selected;

  // ... 对齐逻辑 ...

  // 使用优化的布局更新
  optimizeTransformUpdate(selected as IUI[]);
}
```

#### 样式修改优化

```typescript
// src/components/EditorPanel/ShapeStylePanel.vue
import { optimizeStyleUpdate } from "@/editor/core/leafer-v2-2-export";

const updateColor = (newColor: string) => {
  selectedElements.forEach((el) => (el.fill = newColor));
  // 使用优化的样式更新
  optimizeStyleUpdate(selectedElements);
};
```

---

## 🎨 功能 3: motionVertical - 运动路径垂直对齐

### 场景

支持元素沿竖向路径排列和对齐，特别适合流程图的垂直布局和连接线的垂直排列。

### 核心概念

```typescript
element.motionPath = pathData; // 设置运动路径
element.motionVertical = {
  // 设置垂直对齐（v2.2新增）
  rotation: 0,
  align: "center",
  offset: 0,
};
```

### 使用示例

#### 示例 1: 设置垂直运动路径

```typescript
import { applyMotionVertical } from "@/editor/core/leafer-v2-2-export";

const connector = editor.app.tree.children?.[0];
const verticalPath = ["M", 0, 0, "L", 0, 100]; // 竖向路径

connector.motionPath = verticalPath;
applyMotionVertical(connector, {
  enabled: true,
  rotation: 0,
  align: "center",
  offset: 0,
});
```

#### 示例 2: 使用连接线管理器（推荐）

```typescript
import { createDefaultConnectorMotionManager } from "@/editor/core/leafer-v2-2-export";

// 初始化管理器
const motionManager = createDefaultConnectorMotionManager();

// 设置运动路径
const verticalPath = ["M", 0, 0, "L", 0, 100];
motionManager.setConnectorMotionPath(connector, verticalPath, {
  enabled: true,
  align: "center",
  rotation: 0,
});
```

#### 示例 3: 应用预设对齐

```typescript
const motionManager = createDefaultConnectorMotionManager();

// 顶部对齐
motionManager.applyVerticalPreset(connector, "topAlign");

// 中心对齐
motionManager.applyVerticalPreset(connector, "centerAlign");

// 底部对齐
motionManager.applyVerticalPreset(connector, "bottomAlign");

// 垂直90度旋转
motionManager.applyVerticalPreset(connector, "verticalRotate");

// 垂直180度旋转
motionManager.applyVerticalPreset(connector, "verticalRotate180");
```

#### 示例 4: 自定义垂直配置

```typescript
motionManager.setMotionVertical(connector, {
  enabled: true,
  rotation: 90, // 旋转角度
  align: "top", // 对齐方式
  offset: 10, // 偏移量
});
```

#### 示例 5: 批量设置

```typescript
// 为所有连接线设置垂直对齐
const verticalPath = ["M", 0, 0, "L", 0, 100];
motionManager.setMotionPathBatch(allConnectors, verticalPath, {
  enabled: true,
  align: "center",
  rotation: 0,
});
```

---

## 🚀 集成到编辑器

### 完整初始化示例

```typescript
// src/editor/editor.ts
import { initializeLeafJSV22Features } from "@/editor/core/leafer-v2-2-export";

export default class Editor {
  private v22Features: any;

  constructor(config: IAppConfig = INIT_CONFIG) {
    const app = new App(config);
    this.app = app;

    // ... 其他初始化代码 ...

    // 初始化LeafJS v2.2新功能
    this.v22Features = initializeLeafJSV22Features(this);
  }

  // 提供访问新功能的方法
  getLayerHitThroughManager() {
    return this.v22Features.layerHitThroughManager;
  }

  getConnectorMotionManager() {
    return this.v22Features.connectorMotionManager;
  }

  getEditorUpdateManager() {
    return this.v22Features.editorUpdateManager;
  }
}
```

### 在Vue组件中使用

```vue
<template>
  <div class="layer-panel">
    <div v-for="layer in layers" :key="layer.id" class="layer-item">
      <span>{{ layer.name }}</span>
      <button @click="toggleHitThrough(layer)">
        {{ isHitThroughEnabled(layer) ? "禁用穿透" : "启用穿透" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import type Editor from "@/editor/editor";

const editor = inject<Editor>("editor")!;

const toggleHitThrough = (layer: any) => {
  const manager = editor.getLayerHitThroughManager();
  manager.toggleLayerHitThrough(layer, "overlay");
};

const isHitThroughEnabled = (layer: any) => {
  const manager = editor.getLayerHitThroughManager();
  return manager.isHitThroughEnabled(layer);
};
</script>
```

---

## 📊 性能监控

### 查看更新性能指标

```typescript
const updateManager = editor.getEditorUpdateManager();

// 获取性能指标
const metrics = updateManager.getPerformanceMetrics();
console.log("总更新数:", metrics.totalUpdates);
console.log("优化更新数:", metrics.optimizedUpdates);
console.log("优化率:", (metrics.optimizationRate * 100).toFixed(2) + "%");
console.log("高频更新数:", metrics.frequentUpdates);
console.log("高频更新率:", (metrics.frequentUpdateRate * 100).toFixed(2) + "%");
console.log("平均更新间隔:", metrics.averageUpdateInterval.toFixed(2) + "ms");

// 打印完整性能报告
updateManager.printPerformanceReport();

// 重置性能指标
updateManager.resetMetrics();
```

---

## ✅ 测试功能

### 运行集成测试

```typescript
import { testLeafJSV22Features } from "@/editor/core/leafer-v2-2-export";

// 在编辑器初始化后运行测试
await testLeafJSV22Features(editor);
```

---

## 📝 文件结构

```
src/editor/core/
├── leafer-v2-2-features.ts          # 核心功能实现
├── layer-panel-hit-through.ts       # 图层穿透选择管理
├── connector-motion-path.ts         # 连接线运动路径管理
├── editor-force-update.ts           # 编辑器强制更新管理
├── leafer-v2-2-integration.ts       # 集成示例和文档
├── leafer-v2-2-export.ts            # 统一导出模块
└── LEAFER_V2_2_GUIDE.md             # 本文档
```

---

## 🔗 相关资源

- [LeafJS官方文档](https://www.leaferjs.com/)
- [LeafJS v2.2.2更新日志](https://www.leaferjs.com/ui/update/)
- [leafer-flow项目文档](../../docs/)

---

## 💡 最佳实践

### 1. 选择合适的更新模式

- **纯样式更改** → 使用 `'style'`
- **几何变换（移动/缩放）** → 使用 `'layout'`
- **其他情况** → 使用 `'render'`

### 2. 批量操作时使用队列

```typescript
// ✗ 不推荐：频繁更新
for (const el of elements) {
  el.x += 10;
  el.forceUpdate();
}

// ✓ 推荐：使用队列
for (const el of elements) {
  el.x += 10;
  updateManager.queueUpdate(el, "layout");
}
```

### 3. 监控穿透选择配置

- 定期检查哪些图层启用了穿透
- 避免过多图层启用穿透影响性能
- 在图层删除时清理穿透配置

### 4. 运动路径的垂直对齐

- 在创建连接线时立即设置垂直对齐
- 使用预设减少配置复杂度
- 根据实际布局需求调整对齐方式

---

## ❓ 常见问题

**Q: 启用穿透选择会影响性能吗？**
A: 不会。穿透选择只影响点击事件处理，不影响渲染性能。

**Q: forceUpdate() 和 forceUpdate('render') 有什么区别？**
A: `forceUpdate()` 是完整更新，会触发所有事件。`forceUpdate('render')` 仅更新渲染，不触发属性变化事件，性能更好。

**Q: 如何在现有项目中逐步集成这些功能？**
A: 推荐按优先级：先集成 forceUpdate（性能收益最大） → 再集成 hitThrough（交互优化） → 最后集成 motionVertical（动画特性）。

---

## 📝 更新日志

- **v1.0.0** (2026-07-17): 初始发布，集成LeafJS v2.2.2三个新功能
