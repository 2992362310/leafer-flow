---
name: leafer-flow-icons
description: "Leafer Flow 图标系统使用指南。当需要添加新图标、修改图标样式、或在组件中使用图标时使用此技能。覆盖图标组件用法、命名规范、图标数据结构和添加新图标的流程。"
---

# Leafer Flow 图标系统

本技能描述 Leafer Flow 项目的图标架构和使用规范。

## 架构概览

```
src/assets/icons/
├── index.ts          # 入口，合并导出 + IconName 类型
├── toolbar.ts        # 工具栏图标（绘图、流程图、BPMN、架构图、操作）
└── system.ts         # 系统 UI 图标（箭头、状态、可见性、锁定）

src/components/
└── Icon.vue          # 统一图标组件（FlowIcon）
```

## 图标组件

所有图标必须通过 `Icon.vue` 组件渲染，禁止在其他组件中直接使用 `<svg>` 标签。

`Icon` 已在 `src/main.ts` 中全局注册，无需导入即可使用。

### 基本用法

```vue
<template>
  <!-- 无需 import，直接使用 -->
  <Icon name="select" class="h-5 w-5" />
</template>
```

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `name` | `IconName` | 图标名称，类型安全的联合类型 |

### 样式控制

- 尺寸通过 Tailwind class 控制：`h-3 w-3`、`h-4 w-4`、`h-5 w-5`、`h-6 w-6`
- 颜色通过 `stroke="currentColor"` 自动继承父元素文字颜色
- 可叠加 `opacity`、`rotate` 等 class

```vue
<Icon name="lock" class="w-3 h-3 text-warning" />
<Icon name="arrow-up" class="w-3 h-3 rotate-180" />
<Icon name="layer" class="w-4 h-4 opacity-70" />
```

## 图标数据结构

每个图标定义为 TypeScript 对象：

```ts
{
  path: string,      // SVG path d 属性
  viewBox: string,   // 默认 "0 0 24 24"
  title: string,     // 中文显示名称，用于无障碍
}
```

## 完整图标列表

### 系统图标（system.ts）

| 名称 | 用途 |
|------|------|
| `arrow-down` | 向下箭头 |
| `arrow-up` | 向上箭头 |
| `warning` | 警告状态 |
| `success` | 成功状态 |
| `error` | 错误状态 |
| `info` | 信息提示 |
| `layer` | 图层 |
| `visible` | 可见（眼睛） |
| `hidden` | 隐藏（带斜线眼睛） |
| `lock` | 锁定 |
| `unlock` | 解锁 |

### 工具栏图标（toolbar.ts）

| 名称 | 用途 |
|------|------|
| `select` | 选择工具 |
| `draw_rect` | 矩形 |
| `draw_circle` | 圆形 |
| `draw_diamond` | 菱形 |
| `draw_triangle` | 三角形 |
| `draw_pentagon` | 五边形 |
| `draw_hexagon` | 六边形 |
| `draw_arrow` | 连接线 |
| `draw_text` | 文本 |
| `draw_freehand` | 自由绘制 |
| `flow_*` | 流程图符号（19 个） |
| `bpmn_*` | BPMN 符号（8 个） |
| `arch_*` | 架构图符号（10 个） |
| `align_*` | 对齐操作（6 个） |
| `distribute_*` | 分布操作（2 个） |
| `connector_label` | 连线标签 |
| `template` | 模板 |
| `undo` / `redo` | 撤销 / 重做 |
| `clear` | 清空画布 |
| `group` / `ungroup` | 组合 / 取消组合 |
| `save` / `load` / `export` | 文件操作 |
| `agent` | AI 助手 |

## 命名规范

- 工具图标：`snake_case`，如 `draw_rect`、`flow_start_end`、`arch_component`
- 系统图标：`kebab-case`，如 `arrow-down`、`lock`、`visible`
- 前缀分类：`draw_`、`flow_`、`bpmn_`、`arch_`、`align_`、`distribute_`

## 添加新图标

### 步骤

1. 在对应的数据文件中添加图标定义（`toolbar.ts` 或 `system.ts`）
2. `IconName` 类型会自动从 `icons` 对象推导，无需手动维护

### 示例：添加工具图标

编辑 `src/assets/icons/toolbar.ts`：

```ts
export const toolbarIcons = {
  // ... 现有图标
  my_new_tool: {
    path: "M4 6h16v12H4z",           // SVG path
    viewBox: "0 0 24 24",
    title: "我的新工具",
  },
};
```

### 示例：添加系统图标

编辑 `src/assets/icons/system.ts`：

```ts
export const systemIcons = {
  // ... 现有图标
  'my-status': {
    path: "M12 2l-9.5 5 9.5 5 9.5-5L12 2z",
    viewBox: "0 0 24 24",
    title: '我的状态',
  },
};
```

### path 获取方式

- 从 [Heroicons](https://heroicons.com/)、[Lucide](https://lucide.dev/) 等图标库复制 SVG
- 提取 `<path>` 元素的 `d` 属性值
- 确保 viewBox 为 `0 0 24 24`

## 禁止事项

- **禁止**在 Vue 组件中直接使用 `<svg>` 标签
- **禁止**在组件中 `import Icon`（已全局注册，直接使用即可）
- **禁止**使用 `<img>` 加载 SVG/PNG 图标
- **禁止**使用 CSS `background-image` 引用图标
- **禁止**使用第三方图标库（FontAwesome、Material Icons 等）
