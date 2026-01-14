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

        // 确定 Group 所在位置，以便将 children 插回原位
        let insertIndex = parent.children?.indexOf(group) ?? -1
        
        // 复制一份 children，因为 dropTo 会修改 parent.children
        const children = [...group.children] as IUI[]

        children.forEach(child => {
            // 使用 dropTo 自动处理坐标变换（保持世界坐标视觉不变）
            // 如果能确定插入位置更好，否则会 append 到最后
            if (insertIndex > -1) {
                 child.dropTo(parent, insertIndex)
                 // 插入后，后续元素应该在 index + 1
                 insertIndex++
            } else {
                 child.dropTo(parent)
            }
            
            newSelection.push(child)
        })

        // 删除空 Group ( children 已被 dropTo 移走)
        group.remove()
    })

    // 选中解散出来的所有元素
    app.editor.select(newSelection)
    
    // 保存历史
    editor.history.save()

    return { success: true, message: '已取消组合' }
}
