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
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    list.forEach(node => {
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
        // Group 通常不需要定宽高，通过 children 撑开，但为了后续操作方便可以根据内容推导
        // Leafer Group 默认是自适应的
    })

    // 4. 将 Group 插入到父节点中（插入位置：最上层选中元素的位置，或者直接最上层）
    // 为了防止遮挡其他未选中元素，理想是插入到 selection 中最顶层元素的那个 z-index
    // 简单起见，add 到末尾（最顶层）
    parent.add(group)

    // 5. 移动元素
    // 需要因为 Group 有个偏移 (groupX, groupY)，所以子元素的坐标要减去这个偏移
    // 此外要考虑层级：为了保持原来的相对覆盖关系，应该按原来的 z-index 顺序添加到 group
    
    // 按在 parent 中的 index 排序，保证在 group 里也是这个顺序
    const sortedList = [...list].sort((a, b) => {
        return parent.children.indexOf(a) - parent.children.indexOf(b)
    })

    sortedList.forEach(node => {
        // 这一步很重要：在 add 到新父节点之前，node 的 worldTransform 是有用的
        // 但是 node.x / node.y 是相对于 parent 的
        
        // 由于 group 也在 parent 下，且无旋转缩放，坐标变换就是简单的减法
        
        // 记录一下原始的世界坐标（或者相对于 parent 的坐标，因为 group 也放 parent 里）
        // 修正：我们必须用手动计算，因为一旦 add 到 group，parent 就变了
        // node 的 x/y 是相对 parent 的。
        // group 的 x/y 也是相对 parent 的。
        // 所以新坐标应该是 (node.x - group.x, node.y - group.y)
        // 前提是 node 和 group 在同一个 parent 下。
        
        const oldX = node.x || 0
        const oldY = node.y || 0
        
        // 这一步会自动从旧 parent 移除并添加到 group
        group.add(node)
        
        node.x = oldX - groupX
        node.y = oldY - groupY
    })

    // 6. 选中新的 Group
    app.editor.select(group)
    
    // 7. 保存历史
    editor.history.save()

    return { success: true, message: '已组合所选元素' }
}
