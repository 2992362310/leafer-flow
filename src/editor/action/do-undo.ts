import type Editor from '../editor'

/**
 * 撤销操作
 * @param editor 编辑器实例
 * @returns 执行结果
 */
export function doUndo(editor: Editor): { success: boolean; message: string } {
  try {
    const undoRedo = editor.undoRedo
    // 检查是否存在可撤销的操作
    if (undoRedo.his.hasUndo) {
      // 执行撤销操作
      undoRedo.undo()
      return {
        success: true,
        message: '已撤销操作'
      }
    } else {
      return {
        success: false,
        message: '没有可撤销的操作'
      }
    }

  } catch (error) {
    console.error('执行撤销操作时发生错误:', error)

    return {
      success: false,
      message: '撤销操作失败: ' + (error instanceof Error ? error.message : '未知错误')
    }
  }
}
