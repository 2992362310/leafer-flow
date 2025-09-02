# Leafer-Flow 开发指导文档

## 项目概述

Leafer-Flow 是一个基于 Vue 3 和 LeaferJS 的流程图设计工具。该项目提供了一个可扩展的编辑器框架，支持多种图形绘制、插件系统和现代化 UI 界面。

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- LeaferJS - 核心图形引擎
- TailwindCSS + DaisyUI - UI 框架
- Vite - 构建工具

## 项目结构

```
src/
├── assets/           # 静态资源
│   └── icons/        # 图标定义
├── components/       # Vue 组件
├── editor/           # 编辑器核心逻辑
│   ├── plugins/      # 编辑器插件
│   ├── tools/        # 绘制工具
│   └── types/        # TypeScript 类型定义
├── router/           # Vue 路由（预留）
├── views/            # 页面视图（预留）
├── App.vue           # 主应用组件
├── main.ts           # 应用入口
└── editor.ts         # 编辑器主类
```

## 核心概念

### Editor 类

[Editor](file:///d:/work/test/leafer-flow/src/editor/editor.ts#L8-L47) 是整个编辑器的核心类，负责管理插件、工具和应用实例。

主要功能：
- 管理 Leafer App 实例
- 注册和使用插件
- 注册和执行绘图工具
- 协调各组件间交互

### 插件系统

插件用于扩展编辑器功能，如标尺、对齐辅助等。插件需要实现 [IEditorPlugin](file:///d:/work/test/leafer-flow/src/editor/types/index.ts#L5-L7) 接口。

示例插件结构：
```typescript
const plugin: IEditorPlugin = {
  init(app: App) {
    // 插件初始化逻辑
    return pluginInstance
  }
}
```

使用插件：
```typescript
const pluginInstance = editor.use(plugin)
```

### 工具系统

工具用于实现具体的绘图功能，如绘制矩形、圆形等。工具需要实现 [IEditorTool](file:///d:/work/test/leafer-flow/src/editor/types/index.ts#L9-L13) 接口。

工具注册：
```typescript
editor.register('draw_rect', new DrawRect())
```

工具执行：
```typescript
editor.execute('draw_rect', (result) => {
  // 绘制完成后的回调
})
```

## 组件系统

### 主要组件

1. [App.vue](file:///d:/work/test/leafer-flow/src/App.vue) - 主应用组件
2. [EditorToolbar.vue](file:///d:/work/test/leafer-flow/src/components/EditorToolbar.vue) - 工具栏组件
3. [EditorButton.vue](file:///d:/work/test/leafer-flow/src/components/EditorButton.vue) - 功能按钮组件
4. [EditorLog.vue](file:///d:/work/test/leafer-flow/src/components/EditorLog.vue) - 日志组件
5. [StatusBar.vue](file:///d:/work/test/leafer-flow/src/components/StatusBar.vue) - 状态栏组件
6. [Icon.vue](file:///d:/work/test/leafer-flow/src/components/Icon.vue) - 图标组件

### Icon 组件使用

图标通过 [Icon](file:///d:/work/test/leafer-flow/src/components/Icon.vue#L17-L31) 组件统一管理，避免重复的 SVG 代码。使用方式：

```vue
<Icon name="select" class="h-4 w-4" />
```

可用图标名称参考 [toolbar.ts](file:///d:/work/test/leafer-flow/src/assets/icons/toolbar.ts) 文件。

## 开发指南

### 添加新工具

1. 在 [src/editor/tools/](file:///d:/work/test/leafer-flow/src/editor/tools) 目录下创建工具类文件
2. 继承 [DrawBase](file:///d:/work/test/leafer-flow/src/editor/tools/draw-base.ts#L5-L76) 基类或实现 [IEditorTool](file:///d:/work/test/leafer-flow/src/editor/types/index.ts#L9-L13) 接口
3. 在 [main.ts](file:///d:/work/test/leafer-flow/src/main.ts) 中注册工具
4. 在 [EditorToolbar.vue](file:///d:/work/test/leafer-flow/src/components/EditorToolbar.vue) 中添加工具按钮

### 添加新插件

1. 在 [src/editor/plugins/](file:///d:/work/test/leafer-flow/src/editor/plugins) 目录下创建插件文件
2. 实现 [IEditorPlugin](file:///d:/work/test/leafer-flow/src/editor/types/index.ts#L5-L7) 接口
3. 在 [main.ts](file:///d:/work/test/leafer-flow/src/main.ts) 中使用插件

### 添加新图标

1. 在 [src/assets/icons/toolbar.ts](file:///d:/work/test/leafer-flow/src/assets/icons/toolbar.ts) 中添加图标定义
2. 在组件中通过 [Icon](file:///d:/work/test/leafer-flow/src/components/Icon.vue#L17-L31) 组件使用

### 添加新组件

1. 在 [src/components/](file:///d:/work/test/leafer-flow/src/components/) 目录下创建组件文件
2. 在需要使用的父组件中导入并使用

## 状态管理

项目使用 Vue 的响应式系统进行状态管理：
- 使用 `ref` 和 `reactive` 管理组件内部状态
- 使用 `defineProps` 和 `defineEmits` 进行组件间通信
- 使用模板引用来直接访问子组件方法

## 事件系统

- 使用 LeaferJS 的事件系统处理画布交互
- 使用 Vue 的事件系统处理组件交互

## 构建和部署

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 最佳实践

1. 组件化开发：将功能拆分为独立的组件
2. 类型安全：充分利用 TypeScript 类型系统
3. 图标复用：使用统一的 Icon 组件
4. 工具解耦：通过工具系统实现功能扩展
5. 插件扩展：通过插件系统增强编辑器功能

## 常见问题

### 图标不显示
检查图标名称是否在 [toolbar.ts](file:///d:/work/test/leafer-flow/src/assets/icons/toolbar.ts) 中定义，并确保使用了正确的名称。

### 工具无法执行
检查工具是否已正确注册，并且名称匹配。

### 插件不生效
检查插件是否已正确使用，并查看控制台是否有错误信息。