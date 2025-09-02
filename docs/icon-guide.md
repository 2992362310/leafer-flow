# 图标使用指南

## 概述

Leafer-Flow 使用统一的图标管理系统，所有图标都通过 [Icon.vue](file:///d:/work/test/leafer-flow/src/components/Icon.vue) 组件进行管理。这种设计确保了图标的一致性，并方便维护和扩展。

## 图标组件

### Icon.vue 组件

[Icon.vue](file:///d:/work/test/leafer-flow/src/components/Icon.vue) 是项目中唯一的图标组件，位于 `src/components/` 目录下。它接收两个属性：

- `name`: 图标名称（必填）
- `className`: 自定义 CSS 类名（可选）

使用示例：
```vue
<Icon name="select" class="h-4 w-4" />
```

### 图标定义

所有图标定义都存储在 `src/assets/icons/` 目录中。主要文件包括：

- [toolbar.ts](file:///d:/work/test/leafer-flow/src/assets/icons/toolbar.ts): 工具栏相关图标
- [index.ts](file:///d:/work/test/leafer-flow/src/assets/icons/index.ts): 图标入口文件，整合所有图标

每个图标包含以下属性：
- `path`: SVG 路径数据
- `viewBox`: SVG 视图框
- `title`: 图标标题（用于辅助功能）

## 可用图标

以下是项目中当前可用的所有图标：

| 图标名称 | 预览 | 描述 |
|---------|------|------|
| select | ![select](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTUgMTVsLTIgNUw5IDlsMTEgNC01IDJ6bTAgMGw1IDVNNS4xODggMi4yMzlsLjc3NyAyLjg5N003LjEzNiA3Ljk2NWwtMi44OTgtLjc3N00xMy45NSA0LjA1bC0yLjEyMiAyLjEyMm0tNS42NTcgNS42NTZsLTIuMTIyIDIuMTIyIi8+PC9zdmc+) | 选择工具 |
| rectangle | ![rectangle](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNCA2aDE2djEySDR6Ii8+PC9zdmc+) | 矩形工具 |
| circle | ![circle](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTIgMTJtLTEwIDBhMTAgMTAgMCAxIDAgMjAgMGE1IDAgMSAwIC0yMCAwIi8+PC9zdmc+) | 圆形工具 |
| diamond | ![diamond](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTIgM2w5IDktOSA5LTktOSA5LTl6Ii8+PC9zdmc+) | 菱形工具 |
| arrow | ![arrow](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTMgN2w1IDVtMCAwbC01IDVtNS01SDYiLz48L3N2Zz4=) | 箭头工具 |
| text | ![text](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNNSA0aDN2MTZINXYtMTZ6bTExIDBoLTJ2MTZoMlY0eiIvPjwvc3ZnPg==) | 文本工具 |
| undo | ![undo](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMyAxMGgxMGE4IDggMCAwMSA4IDh2Mk0zIDEwbDYgNm0tNi02bDYtNiIvPjwvc3ZnPg==) | 撤销操作 |
| redo | ![redo](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjEgMTBoLTEwYTggOCAwIDAwLTggOHYybTE4LTEwbC02IDZtNi02bC02LTYiLz48L3N2Zz4=) | 重做操作 |
| clear | ![clear](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMTkgN2wtLjg2NyAxMi4xNDJBMiAyIDAgMDExNi4xMzggMjFINS44NjJhMiAyIDAgMDEtMS45OTUtMS44NThMNSA3bTUgNHY2bTQtNnY2bTEtMTBWNGExIDEgMCAwMC0xLTFoLTRhMSAxIDAgMDBfMSAxIDF2M000IDdoMTYiLz48L3N2Zz4=) | 清空画布 |

## 使用方法

### 基本用法

在任何 Vue 组件中使用图标，只需导入 [Icon](file:///d:/work/test/leafer-flow/src/components/Icon.vue#L17-L31) 组件并传入图标名称：

```vue
<template>
  <Icon name="select" />
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
</script>
```

### 添加样式

可以通过 `className` 属性添加 TailwindCSS 类来控制图标的大小和样式：

```vue
<Icon name="select" class="h-4 w-4 text-blue-500" />
<Icon name="circle" class="h-6 w-6 stroke-red-500" />
```

### 在组件中使用示例

```vue
<template>
  <button class="btn btn-primary">
    <Icon name="select" class="h-4 w-4 mr-2" />
    选择工具
  </button>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
</script>
```

## 添加新图标

要添加新图标，请按照以下步骤操作：

1. 在 [src/assets/icons/toolbar.ts](file:///d:/work/test/leafer-flow/src/assets/icons/toolbar.ts) 中添加新图标定义：

```typescript
export const toolbarIcons = {
  // ...现有图标
  new_icon: {
    path: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0', // SVG路径
    viewBox: '0 0 24 24', // 视图框
    title: '新图标' // 图标标题
  }
}
```

2. 如果图标用于特定功能，确保在组件中正确使用：

```vue
<Icon name="new_icon" class="h-4 w-4" />
```

## 最佳实践

1. **统一使用 Icon 组件**：避免在任何地方直接使用内联 SVG，始终使用 [Icon](file:///d:/work/test/leafer-flow/src/components/Icon.vue#L17-L31) 组件
2. **语义化命名**：图标名称应该清晰表达其用途
3. **合适的尺寸**：根据使用场景选择合适的图标尺寸，通常使用 `h-4 w-4` 或 `h-5 w-5`
4. **颜色控制**：利用 `currentColor` 特性让图标继承文本颜色，或使用特定颜色类
5. **可访问性**：为图标提供有意义的标题，增强可访问性

## 常见问题

### 图标不显示
- 检查图标名称是否正确
- 确保已在图标定义文件中添加该图标
- 检查控制台是否有错误信息

### 图标颜色不对
- 确保 SVG 路径没有填充颜色，使用 `stroke` 而非 `fill`
- 使用 `text-*` 或 `stroke-*` 类控制颜色

### 图标尺寸异常
- 确保设置合适的宽高类，如 `h-4 w-4`
- 检查 SVG 的 viewBox 设置是否正确