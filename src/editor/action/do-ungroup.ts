import { Group } from 'leafer'
import type { IUI, IGroup } from '@leafer-ui/interface'
import type Editor from '../editor'

export function doUnGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  const list = app.editor.list

  // 1. 基本验证
  if (!list || list.length === 0) {
    return { success: false, message: '未选择任何元素' }
  }

  // 2. 筛选出 Group 类型的元素
  const groups = list.filter((node) => node instanceof Group) as Group[]

  if (groups.length === 0) {
    return { success: false, message: '请选择至少一个组合元素' }
  }

  // 3. 检查是否有锁定的 Group
  const lockedGroups = groups.filter((group) => group.locked)
  if (lockedGroups.length > 0) {
    return { success: false, message: `无法取消组合：${lockedGroups.length} 个组合已锁定` }
  }

  const newSelection: IUI[] = []
  let totalChildren = 0

  groups.forEach((group) => {
    const parent = group.parent as IGroup
    if (!parent) return

    // 检查 Group 是否有子元素
    if (!group.children || group.children.length === 0) {
      // 空 Group，直接删除
      group.remove()
      return
    }

    // 确定 Group 所在位置，以便将 children 插回原位
    let insertIndex = parent.children?.indexOf(group) ?? -1

    // 复制一份 children，因为 dropTo 会修改 parent.children
    const children = [...group.children] as IUI[]
    totalChildren += children.length

    children.forEach((child) => {
      // 检查子元素是否锁定（锁定元素仍然可以移动，但给出提示）
      if (child.locked) {
        console.warn('解锁的子元素已锁定:', child)
      }

      // 使用 dropTo 自动处理坐标变换（保持世界坐标视觉不变）
      if (insertIndex > -1) {
        child.dropTo(parent, insertIndex)
        // 插入后，后续元素应该在 index + 1
        insertIndex++
      } else {
        child.dropTo(parent)
      }

      newSelection.push(child)
    })

    // 删除空 Group (children 已被 dropTo 移走)
    group.remove()
  })

  // 4. 选中解散出来的所有元素
  if (newSelection.length > 0) {
    app.editor.select(newSelection)
  }

  // 5. 保存历史记录
  editor.history.save()

  const groupWord = groups.length === 1 ? '组合' : '组合'
  const childWord = totalChildren === 1 ? '元素' : '元素'

  return {
    success: true,
    message: `已解散 ${groups.length} 个${groupWord}，释放 ${totalChildren} 个${childWord}`,
  }
}
