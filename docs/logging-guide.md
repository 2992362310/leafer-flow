# 日志记录规范文档

## 概述

Leafer-Flow 使用统一的日志系统来跟踪应用程序的状态、用户操作和系统事件。本文档详细说明了日志系统的使用方法、规范和最佳实践。

## 日志系统架构

日志系统由以下组件构成：

1. [EditorLog.vue](file:///d:/work/test/leafer-flow/src/components/EditorLog.vue) - UI 组件，负责显示日志信息
2. 日志方法 - 提供不同级别的日志记录功能
3. 日志级别 - 区分日志的重要性和类型

## 日志级别

系统支持以下几种日志级别：

| 级别    | 颜色 | 用途         |
| ------- | ---- | ------------ |
| info    | 灰色 | 普通信息日志 |
| success | 绿色 | 成功操作日志 |
| warning | 黄色 | 警告信息日志 |
| error   | 红色 | 错误信息日志 |

## 使用方法

### 在组件中使用日志

要在组件中使用日志功能，需要先获取日志组件的引用：

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import EditorLog from './components/EditorLog.vue'

const logRef = useTemplateRef('logRef')

// 使用 addLog 方法并指定日志级别
logRef.value?.addLog({ message: '这是一条普通信息日志', level: 'info' })
logRef.value?.addLog({ message: '这是一条成功信息日志', level: 'success' })
logRef.value?.addLog({ message: '这是一条警告信息日志', level: 'warning' })
logRef.value?.addLog({ message: '这是一条错误信息日志', level: 'error' })
</script>

<template>
  <EditorLog ref="logRef" />
</template>
```

### 在 Editor 类中使用日志

在 [Editor](file:///d:/work/test/leafer-flow/src/editor/editor.ts#L8-L47) 类或其他服务类中使用日志，需要通过回调或其他方式传递日志引用：

```typescript
// 示例：在 Editor 类的方法中添加日志
execute<T>(command: IExcuteCommand, callback: TCallback) {
  // ... 执行逻辑 ...

  // 如果需要记录日志，应该通过某种方式传递日志引用
  callback({
    next: next,
    action: 'cancel execute',
    tool: tool,
  })
}
```

## 日志记录规范

### 1. 日志内容规范

- 日志内容应简洁明了，能够准确表达事件信息
- 使用中文记录日志内容
- 避免记录敏感信息（如用户密码、密钥等）
- 日志内容应包含足够的上下文信息

### 2. 日志级别选择规范

- **info**: 用于记录普通操作和状态信息，如"执行某某操作完成"
- **success**: 用于记录成功完成的操作，如"应用初始化完成"
- **warning**: 用于记录潜在问题或需要注意的情况
- **error**: 用于记录错误和异常情况

### 3. 日志记录时机

- 应用启动和初始化完成后
- 用户执行重要操作前后
- 系统状态发生重要变化时
- 异常和错误发生时
- 工具被取消时
- 工具执行完成时

### 4. 特殊场景日志记录

#### 工具取消操作

当一个工具被另一个工具取消时，应记录日志：

```typescript
callback({
  next: next ?? 'select',
  action: 'cancel execute',
  tool: camelToSnake(pre.constructor.name),
})
```

#### 工具执行完成

当工具执行完成时，应在回调中记录日志：

```typescript
callback({
  next: null,
  action: 'success execute',
  tool: camelToSnake(tool.constructor.name),
})
```

## UI 组件功能

### 日志折叠功能

[EditorLog](file:///d:/work/test/leafer-flow/src/components/EditorLog.vue) 组件支持折叠功能，用户可以通过点击折叠按钮来展开或收起日志面板。

### 清空日志

组件提供清空日志的功能，用户可以点击"清空"按钮来清除所有日志记录。

## 最佳实践

### 1. 日志信息的格式化

建议使用统一的格式来记录日志信息：

```javascript
// 推荐格式：动词 + 对象 + 结果/状态
'执行 绘制矩形 完成'
'应用 初始化完成'
'取消 上一次操作'
```

### 2. 避免重复日志

- 避免在短时间内记录大量重复的日志信息
- 对于频繁触发的操作，可以考虑限制日志记录频率

### 3. 日志性能考虑

- 日志记录不应影响主业务流程的性能
- 避免在日志记录中进行复杂计算

## 常见问题

### 日志没有显示在 UI 上

1. 检查是否正确获取了日志组件的引用
2. 检查是否调用了正确的日志方法
3. 检查浏览器控制台是否有相关错误信息

### 日志级别显示不正确

1. 检查是否使用了正确的日志方法
2. 检查 [EditorLog.vue](file:///d:/work/test/leafer-flow/src/components/EditorLog.vue) 组件中的样式定义

## 未来改进计划

1. 增加日志持久化功能
2. 支持日志导出功能
3. 增加更多日志级别
4. 支持日志过滤和搜索功能