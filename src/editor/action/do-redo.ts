import type Editor from '../editor'

/**
 * 重做操作
 * @param editor 编辑器实例
 * @returns 执行结果
 */
export function doRedo(editor: Editor): { success: boolean; message: string } {
  try {
    // 检查是否存在可重做的操作
    if (editor.app.editor.hasRedo()) {
      // 执行重做操作
      editor.app.editor.redo()
      return {
        success: true,
        message: '已重做操作'
      }
    } else {
      return {
        success: false,
        message: '没有可重做的操作'
      }
    }
  } catch (error) {
    console.error('执行重做操作时发生错误:', error)
    
    return {
      success: false,
      message: '重做操作失败: ' + (error instanceof Error ? error.message : '未知错误')
    }
  }
}