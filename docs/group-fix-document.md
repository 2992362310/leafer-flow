# Group 编组问题修复说明

## 🐛 问题描述

用户反馈：group 优化后，编组时会"把原来的组合给打散"，这不是期望的效果。

## 🔍 问题分析

### 根本原因

**选择器行为**：当用户点击选择一个 Group 时，Leafer Editor 可能会返回 Group 内的所有子元素，而不是 Group 本身。

**场景重现**：
1. 用户有一个 Group，包含 3 个矩形
2. 用户点击选择这个 Group（期望选中 Group 本身）
3. 实际 `app.editor.list` 返回的是 3 个矩形元素
4. 执行编组时，这 3 个矩形被重新组合，原有的 Group 结构丢失
5. **结果**：看起来像是"打散了原来的组合"

**期望行为**：
- 如果选中的是一个 Group 的所有子元素，应该理解为选中了整个 Group
- 编组时，应该保留原有的 Group 结构（嵌套编组）

## ✅ 修复方案

### 智能检测与替换

添加 `smartGroupSelection()` 函数，在编组前智能处理选择列表：

```typescript
function smartGroupSelection(list: IUI[]): IUI[] {
  // 1. 检测每个元素的父 Group
  const parentGroupMap = new Map<IGroup, IUI[]>()

  list.forEach((node) => {
    if (node.parent instanceof Group) {
      const parentGroup = node.parent
      if (!parentGroupMap.has(parentGroup)) {
        parentGroupMap.set(parentGroup, [])
      }
      parentGroupMap.get(parentGroup)?.push(node)
    }
  })

  // 2. 检查是否有 Group 的所有子元素都被选中
  const groupsToReplace: IGroup[] = []

  parentGroupMap.forEach((selectedChildren, parentGroup) => {
    const allChildren = parentGroup.children
    if (!allChildren) return

    // 检查是否选中了所有子元素
    const allSelected = allChildren.length === selectedChildren.length &&
      allChildren.every(child => selectedChildren.includes(child))

    if (allSelected) {
      groupsToReplace.push(parentGroup)
    }
  })

  // 3. 替换：移除 Group 内的子元素，添加 Group 本身
  if (groupsToReplace.length > 0) {
    const groupSet = new Set(groupsToReplace)

    const filteredList = list.filter((node) => {
      // 如果节点的父 Group 在替换列表中，移除该节点
      if (node.parent instanceof Group && groupSet.has(node.parent)) {
        return false
      }
      return true
    })

    // 添加 Group 本身
    filteredList.push(...groupsToReplace)

    return filteredList
  }

  return list
}
```

### 应用智能检测

在 `doGroup()` 函数开始时应用智能检测：

```typescript
export function doGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  let list = app.editor.list as IUI[]

  // 基本验证
  if (!list || list.length === 0) {
    return { success: false, message: '未选择任何元素' }
  }

  // 智能处理 Group 选择
  list = smartGroupSelection(list)

  // 更新选择列表（视觉反馈）
  if (list !== app.editor.list) {
    app.editor.select(list)
  }

  // 继续正常编组流程...
}
```

### 改进反馈消息

添加更详细的消息，区分不同的编组情况：

```typescript
// 统计实际组合的元素（包括嵌套的 Group）
const groupCount = list.filter((node) => node instanceof Group).length
const elementCount = list.length - groupCount

let message = '已组合'
if (groupCount > 0 && elementCount > 0) {
  message += ` ${groupCount} 个组合和 ${elementCount} 个元素`
} else if (groupCount > 0) {
  message += ` ${groupCount} 个组合（嵌套编组）`
} else {
  message += ` ${elementCount} 个元素`
}

return { success: true, message }
```

## 🎯 修复后的行为

### 场景 1: 重新编组一个 Group

**操作**：
1. 创建一个 Group（包含 2 个矩形）
2. 选择这个 Group（实际选中了 2 个矩形）
3. 点击"组合"按钮

**修复前**：
- ❌ 创建新的 Group，包含 2 个矩形
- ❌ 原有的 Group 结构丢失

**修复后**：
- ✅ 智能检测：选中了 Group 的所有子元素
- ✅ 自动替换：将 2 个矩形替换为 Group 本身
- ✅ 提示："请选择至少两个元素进行组合"（因为只有一个 Group）
- 或者如果还有其他元素，正常嵌套编组

### 场景 2: 嵌套编组

**操作**：
1. 创建一个 Group A（包含 2 个矩形）
2. 再绘制一个圆形
3. 选择 Group A 和圆形
4. 点击"组合"按钮

**修复前**：
- ❌ 可能选中 Group A 内的 2 个矩形 + 圆形
- ❌ 结果：Group B > [Rect1, Rect2, Circle]
- ❌ Group A 被解散

**修复后**：
- ✅ 智能检测：Group A 的所有子元素被选中
- ✅ 自动替换：将 [Rect1, Rect2] 替换为 Group A
- ✅ 结果：Group B > [Group A, Circle]
- ✅ 消息："已组合 1 个组合和 1 个元素"

### 场景 3: 多个 Group 嵌套

**操作**：
1. 创建 Group A（2 个矩形）
2. 创建 Group B（2 个圆形）
3. 选择 Group A 和 Group B
4. 点击"组合"按钮

**修复后**：
- ✅ 自动检测并替换两个 Group
- ✅ 结果：Group C > [Group A, Group B]
- ✅ 消息："已组合 2 个组合（嵌套编组）"

## 📊 技术细节

### dropTo 方法行为

`node.dropTo(targetGroup)` 方法：
- 如果 `node` 是普通元素：移动到 `targetGroup` 中
- 如果 `node` 是 Group：将整个 Group（包含其子元素）移动到 `targetGroup` 中
- **不会解散 Group**，保持嵌套结构

### 视觉反馈

当检测到 Group 被替换时，会自动更新编辑器的选择列表：

```typescript
// 更新选择列表（视觉反馈）
if (list !== app.editor.list) {
  app.editor.select(list)
}
```

这样用户可以看到选择框从多个元素变成一个 Group，提供清晰的视觉反馈。

## 🧪 测试场景

### 测试 1: 单个 Group 重新编组

**步骤**：
1. 创建 Group（2 个矩形）
2. 选择 Group
3. 按 `Ctrl+G`

**预期**：
- 提示："请选择至少两个元素进行组合"
- 或无法操作（因为只选中了一个 Group）

### 测试 2: Group + 元素嵌套编组

**步骤**：
1. 创建 Group A（2 个矩形）
2. 绘制圆形
3. 选择所有元素
4. 按 `Ctrl+G`

**预期**：
- 消息："已组合 1 个组合和 1 个元素"
- 层级结构：Group B > [Group A, Circle]
- 移动 Group B，所有元素跟随移动

### 测试 3: 多个 Group 嵌套

**步骤**：
1. 创建 Group A 和 Group B
2. 选择两个 Group
3. 按 `Ctrl+G`

**预期**：
- 消息："已组合 2 个组合（嵌套编组）"
- 层级结构：Group C > [Group A, Group B]

### 测试 4: 部分子元素编组

**步骤**：
1. 创建 Group（3 个矩形）
2. 选择其中 2 个矩形
3. 按 `Ctrl+G`

**预期**：
- 消息："已组合 2 个元素"
- 层级结构：原来的 Group 结构改变
- 注意：这是特殊情况，不建议操作

## 📝 相关文件

- `src/editor/action/do-group.ts` - 编组功能实现（已修复）
- `docs/group-issue-analysis.md` - 问题分析文档
- `docs/group-optimization.md` - 之前的优化文档

## ✨ 总结

**修复状态**: ✅ 已完成

**修复内容**:
- ✅ 添加智能检测，防止无意中打散 Group
- ✅ 支持嵌套编组（Group 内的 Group）
- ✅ 改进反馈消息，明确编组类型
- ✅ 提供视觉反馈，让用户知道发生了什么

**代码变更**:
- 修改文件: `src/editor/action/do-group.ts`
- 新增函数: `smartGroupSelection()`
- 新增文档: `docs/group-issue-analysis.md`

**测试建议**: 按照上述 4 个测试场景进行验证
