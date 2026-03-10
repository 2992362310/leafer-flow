# Group 功能问题分析

## 🐛 问题描述

用户反馈：group 优化后，编组时会"把原来的组合给打散"。

## 🔍 问题分析

### 可能的原因

#### 假设 1: 选择器自动展开 Group

**场景**：
1. 用户有一个 Group，包含 3 个元素
2. 用户点击选择这个 Group
3. `app.editor.list` 返回的不是 Group 本身，而是 Group 内的 3 个元素
4. 执行编组时，这 3 个元素被重新组合，原有的 Group 结构丢失

**验证方法**：
```typescript
// 在 do-group 中添加日志
console.log('Selected elements:', list)
console.log('Has Group?', list.some(item => item instanceof Group))
```

#### 假设 2: dropTo 方法解散 Group

**场景**：
1. 用户选中了一个 Group 和其他元素
2. 执行 `node.dropTo(newGroup)` 时
3. 如果 node 是一个 Group，它的子元素被提取出来，而不是整体移动

**验证方法**：
查看 Leafer 的 `dropTo` 文档或源码。

### 解决方案

#### 方案 1: 检测并保留 Group 结构

```typescript
export function doGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  let list = app.editor.list as IUI[]

  // 新增：检查选中的元素中是否有 Group 的子元素
  // 如果选中的是 Group 内的所有子元素，应该理解为选中了整个 Group
  const groupsToPreserve: Group[] = []
  
  list.forEach(node => {
    if (node.parent instanceof Group) {
      // 检查是否选中了该 Group 的所有子元素
      const parentGroup = node.parent
      const allChildrenSelected = parentGroup.children?.every(child => 
        list.includes(child)
      )
      
      if (allChildrenSelected && !groupsToPreserve.includes(parentGroup)) {
        groupsToPreserve.push(parentGroup)
      }
    }
  })

  // 如果检测到应该保留的 Group，替换 list 中的元素
  if (groupsToPreserve.length > 0) {
    const preservedSet = new Set(groupsToPreserve)
    list = list.filter(node => {
      // 移除 Group 内的子元素
      if (node.parent instanceof Group && preservedSet.has(node.parent)) {
        return false
      }
      return true
    })
    // 添加 Group 本身
    list.push(...groupsToPreserve)
  }

  // 继续正常的编组流程...
}
```

#### 方案 2: 明确 Group 选择行为

修改编辑器配置，确保选择 Group 时返回 Group 本身，而不是其子元素。

```typescript
// 在 editor.ts 中
app.editor.config.selectGroupAsWhole = true // 假设有这样的配置
```

#### 方案 3: 添加智能检测

```typescript
export function doGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  const list = app.editor.list as IUI[]

  // 智能检测：如果选中的元素都属于同一个 Group，提示用户
  const parents = new Set(list.map(node => node.parent))
  
  if (parents.size === 1) {
    const commonParent = Array.from(parents)[0]
    if (commonParent instanceof Group) {
      // 检查是否选中了 Group 的所有子元素
      const allChildren = commonParent.children
      const allSelected = allChildren?.length === list.length && 
        allChildren.every(child => list.includes(child))
      
      if (allSelected) {
        // 用户可能想要选中整个 Group，而不是重新编组
        return { 
          success: false, 
          message: '已选中组合内的所有元素，无需重新编组' 
        }
      }
    }
  }

  // 继续正常流程...
}
```

## 🧪 测试场景

### 场景 1: 重新编组一个 Group

**步骤**：
1. 创建一个 Group（包含 2 个矩形）
2. 选择这个 Group（确保选中的是 Group 本身）
3. 点击"组合"按钮

**预期结果**：
- ❌ 应该提示"请选择至少两个元素进行组合"
- 或者 创建一个新 Group，包含旧的 Group（嵌套）

**当前可能的问题**：
- 如果编辑器自动展开了 Group 选择，会选中 Group 内的 2 个矩形
- 编组时创建了一个新 Group，看起来像是"打散了原来的组合"

### 场景 2: 嵌套编组

**步骤**：
1. 创建一个 Group A（包含 2 个矩形）
2. 再绘制一个圆形
3. 选择 Group A 和圆形
4. 点击"组合"按钮

**预期结果**：
- ✅ 创建新 Group B，包含 Group A 和圆形
- 层级结构：Group B > [Group A, Circle]

**当前可能的问题**：
- 如果选中的是 Group A 内的元素（而不是 Group A 本身），结果会是：
- Group B > [Rect1, Rect2, Circle]
- Group A 被解散了

## 📝 修复建议

1. **短期修复**：添加智能检测，防止用户无意中打散 Group
2. **中期优化**：修改选择行为，确保选择 Group 时返回 Group 本身
3. **长期方案**：添加"编辑 Group"模式，区分"选择 Group"和"选择 Group 内元素"

## 🔧 临时解决方案

在修复之前，可以先添加提示：

```typescript
// 在 do-group.ts 中
const hasGroupChildren = list.some(node => 
  node.parent instanceof Group && 
  list.filter(n => n.parent === node.parent).length === node.parent.children?.length
)

if (hasGroupChildren) {
  return {
    success: false,
    message: '检测到组合的所有子元素被选中，是否要重新编组？'
  }
}
```
