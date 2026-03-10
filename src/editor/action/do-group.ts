import { Group } from 'leafer'
import type { IUI, IGroup } from '@leafer-ui/interface'
import type Editor from '../editor'

/**
 * 智能检测并处理 Group 选择
 * 如果选中的元素包含某个 Group 的所有子元素，替换为选中该 Group
 */
function smartGroupSelection(list: IUI[]): IUI[] {
  // 检测每个元素的父 Group
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

  // 检查是否有 Group 的所有子元素都被选中
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

  // 如果有需要替换的 Group，过滤并替换
  if (groupsToReplace.length > 0) {
    const groupSet = new Set(groupsToReplace)
    
    // 移除 Group 内的子元素，添加 Group 本身
    const filteredList = list.filter((node) => {
      // 如果节点的父 Group 在替换列表中，移除该节点
      if (node.parent instanceof Group && groupSet.has(node.parent)) {
        return false
      }
      return true
    })

    // 添加 Group 本身
    filteredList.push(...groupsToReplace)

    console.log('智能编组：检测到完整的 Group，自动替换为选择 Group 本身', groupsToReplace)

    return filteredList
  }

  return list
}

export function doGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  let list = app.editor.list as IUI[]

  // 1. 基本验证
  if (!list || list.length === 0) {
    return { success: false, message: '未选择任何元素' }
  }

  // 2. 智能处理 Group 选择
  list = smartGroupSelection(list)

  // 更新选择列表（视觉反馈）
  if (list !== app.editor.list) {
    app.editor.select(list)
  }

  if (list.length < 2) {
    return { success: false, message: '请选择至少两个元素进行组合' }
  }

  // 3. 检查是否有锁定元素
  const lockedElements = list.filter((node) => node.locked)
  if (lockedElements.length > 0) {
    return { success: false, message: `无法组合：${lockedElements.length} 个元素已锁定` }
  }

  // 4. 检查是否所有元素都有父节点
  const elementsWithoutParent = list.filter((node) => !node.parent)
  if (elementsWithoutParent.length > 0) {
    return { success: false, message: '无法组合：部分元素没有父节点' }
  }

  // 5. 寻找共同父节点
  const first = list[0]
  const parent = first.parent as IGroup

  // 检查是否所有元素都在同一父节点下
  const differentParentElements = list.filter((node) => node.parent !== parent)
  if (differentParentElements.length > 0) {
    return { success: false, message: '无法组合：元素来自不同的父容器' }
  }

  // 6. 计算包围盒（使用 Leafer 的内置方法）
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  list.forEach((node) => {
    const bounds = node.getBounds('box', parent as unknown as IUI)
    if (!bounds) return

    if (bounds.x < minX) minX = bounds.x
    if (bounds.y < minY) minY = bounds.y
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height
  })

  const groupX = minX !== Infinity ? minX : 0
  const groupY = minY !== Infinity ? minY : 0

  // 7. 创建 Group
  const group = new Group({
    x: groupX,
    y: groupY,
    editable: true, // 允许编辑
    name: '组合', // 添加默认名称
  })

  // 8. 确定 Group 的插入位置（最上层选中元素的位置）
  let insertIndex = parent.children ? parent.children.length : 0
  if (parent.children) {
    const indexes = list
      .filter((item) => item.parent === parent)
      .map((item) => parent.children?.indexOf(item) ?? -1)
      .filter((idx) => idx >= 0)

    if (indexes.length > 0) {
      insertIndex = Math.max(...indexes)
    }
  }

  // 9. 插入 Group 到父节点
  if (parent.children && insertIndex < parent.children.length) {
    parent.addAt(group, insertIndex)
  } else {
    parent.add(group)
  }

  // 10. 移动元素到 Group 中（按原有顺序）
  const sortedList = [...list].sort((a, b) => {
    const idxA = a.parent?.children?.indexOf(a) ?? -1
    const idxB = b.parent?.children?.indexOf(b) ?? -1
    return idxA - idxB
  })

  sortedList.forEach((node) => {
    // dropTo 会自动处理 Group 的嵌套
    // 如果 node 是一个 Group，它会作为一个整体移动，不会解散
    node.dropTo(group)
  })

  // 11. 选中新创建的 Group
  app.editor.select(group)

  // 12. 保存历史记录
  editor.history.save()

  // 13. 统计实际组合的元素（包括嵌套的 Group）
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
}
