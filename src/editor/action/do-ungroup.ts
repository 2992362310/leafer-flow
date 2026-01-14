import { Group } from 'leafer'
import type { IUI } from '@leafer-ui/interface'
import type Editor from '../editor'

export function doUnGroup(editor: Editor): { success: boolean; message: string } {
    const { app } = editor
    const list = app.editor.list

    // 筛选出 Group 类型的元素
    const groups = list.filter(node => node instanceof Group) as Group[]

    if (groups.length === 0) {
        return { success: false, message: '未选择组合元素' }
    }

    const newSelection: IUI[] = []

    groups.forEach(group => {
        const parent = group.parent
        if (!parent) return

        const groupX = group.x || 0
        const groupY = group.y || 0
        
        // 复制一份 children，因为在遍历过程中 modify 会影响 array
        const children = [...group.children] as IUI[]

        children.forEach(child => {
            const childOldX = child.x || 0
            const childOldY = child.y || 0

            // 移回原父级
            parent.add(child)
            
            // 恢复坐标 (父级坐标系)
            child.x = childOldX + groupX
            child.y = childOldY + groupY
            
            newSelection.push(child)
        })

        // 删除空 Group
        group.remove()
    })

    // 选中解散出来的所有元素
    app.editor.select(newSelection)
    
    // 保存历史
    editor.history.save()

    return { success: true, message: '已取消组合' }
}
