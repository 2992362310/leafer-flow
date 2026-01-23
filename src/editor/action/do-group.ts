import { Group } from 'leafer'
import type { IUI, IGroup } from '@leafer-ui/interface'
import type Editor from '../editor'

export function doGroup(editor: Editor): { success: boolean; message: string } {
  const { app } = editor
  const list = app.editor.list as IUI[]

  if (list.length < 2) {
    return { success: false, message: '请选择至少两个元素进行组合' }
  }

  // 1. 寻找共同父节点 (简化处理：假设都在同一层级，取第一个元素的父节点)
  const first = list[0]
  if (!first) return { success: false, message: '未选择元素' }
  const parent = first.parent as IGroup
  if (!parent) return { success: false, message: '无法组合：找不到父节点' }

  // 2. 计算包围盒
  // Leafer 的 Bounds 计算比较完善，这里手动根据 x,y,width,height 计算世界坐标/父级坐标的包围盒
  // 注意：如果有旋转，简单的 x/y/width/height 计算包围盒可能不准确。
  // 使用 getBounds('parent') 获取相对于父级的包围盒是更稳妥的做法

  // 初始化包围盒数据
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  list.forEach((node) => {
    // 获取相对于父级的包围盒 (传入 parent 实例)
    // 注意：如果 node.parent 不等于 parent（比如跨层级选择），这里计算的相对 bounds 依然是相对于 parent 的
    const bounds = node.getBounds('box', parent as unknown as IUI)

    if (!bounds) return // 安全检查

    if (bounds.x < minX) minX = bounds.x
    if (bounds.y < minY) minY = bounds.y
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height
  })

  const groupX = minX !== Infinity ? minX : 0
  const groupY = minY !== Infinity ? minY : 0
  // Group 通常不需要定宽高，通过 children 撑开

  // 3. 创建 Group
  const group = new Group({
    x: groupX,
    y: groupY,
  })

  // 4. 将 Group 插入到父节点中（插入位置：最上层选中元素的位置）
  // 获取选中元素在 parent 中的最大索引，插入到那里
  let insertIndex = parent.children ? parent.children.length : 0
  if (parent.children) {
    // 过滤出同一父级的元素索引
    const indexes = list
      .filter((item) => item.parent === parent)
      .map((item) => parent.children!.indexOf(item))
    if (indexes.length > 0) {
      insertIndex = Math.max(...indexes)
    }
  }

  // 如果插入位置有效，使用 addAt；否则 add
  // 注意：如果是 parent 的末尾，addAt(length) 等同于 add
  // 但是这里要在 add group 之前计算索引，一旦 node 被移走，索引会变
  // 所以先加 group，再移 node？
  // 不，addAt 会改变后续元素的索引，但不影响前面的。
  // 我们先插入 Group，再 dropTo。

  // 只要 parent 存在，就可以添加
  if (parent.children && insertIndex < parent.children.length) {
    parent.addAt(group, insertIndex)
  } else {
    parent.add(group)
  }

  // 5. 移动元素
  // 使用 dropTo 自动处理坐标变换（保持世界坐标视觉不变）

  // 按在 parent 中的 index 排序，保证在 group 里也是这个顺序 (虽然 dropTo 会 append，如果源顺序乱了，group 里也乱)
  const sortedList = [...list].sort((a, b) => {
    const idxA = a.parent?.children?.indexOf(a) ?? -1
    const idxB = b.parent?.children?.indexOf(b) ?? -1
    return idxA - idxB
  })

  sortedList.forEach((node) => {
    node.dropTo(group)
  })

  // 6. 选中新的 Group
  app.editor.select(group)

  // 7. 保存历史
  editor.history.save()

  return { success: true, message: '已组合所选元素' }
}
