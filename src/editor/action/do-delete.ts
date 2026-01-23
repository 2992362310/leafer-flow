import type Editor from '../editor'

/**
 * 删除选中元素
 * @param editor 编辑器实例
 * @returns 执行结果
 */
export function doDelete(editor: Editor): { success: boolean; message: string } {
  try {
    const list = editor.app.editor.list
    if (!list.length) {
      return {
        success: false,
        message: '未选择元素',
      }
    }

    // 复制一份列表进行删除，避免遍历时数组变化的问题
    const targets = [...list]

    // 执行删除
    targets.forEach((element) => {
      element.remove()
    })

    // 清空选择状态
    editor.app.editor.cancel()

    // 保存历史记录
    editor.history.save()

    return {
      success: true,
      message: `已删除 ${targets.length} 个元素`,
    }
  } catch (error) {
    console.error('执行删除操作时发生错误:', error)
    return {
      success: false,
      message: '删除操作失败',
    }
  }
}
