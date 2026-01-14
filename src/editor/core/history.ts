import { App, UI } from 'leafer'

export class HistoryManager {
  private app: App
  private undoStack: any[] = []
  private redoStack: any[] = []
  private limit = 20
  private isExecuting = false

  constructor(app: App) {
    this.app = app
    // 保存初始状态
    this.save()
  }

  // 保存当前画布状态
  public save() {
    if (this.isExecuting) return

    // 获取当前画布的 JSON 数据
    // 注意：只保存 children 是更稳妥的方式，避免将 App/Leafer 容器本身嵌套进去
    const json = this.app.tree.toJSON()
    const data = json.children || []

    // 简单防抖：如果新状态和栈顶一样（比如无操作点击），忽略
    // 这里做简略判断，比较 json 字符串长度或者简单的深度比较
    const last = this.undoStack[this.undoStack.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(data)) {
        return
    }
    
    this.undoStack.push(data)
    
    // 限制栈大小
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }

    // 清空重做栈
    this.redoStack = []
    
    console.log('History saved. Undo stack:', this.undoStack.length)
  }

  public undo() {
    // 至少要保留一个初始状态，所以长度大于1才能撤销
    if (this.undoStack.length < 2) return false

    this.isExecuting = true
    
    // 1. 将当前状态移入 redo 栈
    const current = this.undoStack.pop()
    this.redoStack.push(current)

    // 2. 获取上一个状态
    const prev = this.undoStack[this.undoStack.length - 1]

    // 3. 应用状态
    this.applyState(prev)

    this.isExecuting = false
    return true
  }

  public redo() {
    if (this.redoStack.length === 0) return false

    this.isExecuting = true

    // 1. 取出 redo 栈顶状态
    const next = this.redoStack.pop()
    
    // 2. 移入 undo 栈
    this.undoStack.push(next)

    // 3. 应用状态
    this.applyState(next)

    this.isExecuting = false
    return true
  }

  private applyState(children: any[]) {
    // 清空画布并重新加载数据
    this.app.tree.clear()
    
    // 重新添加子元素
    if (children && Array.isArray(children)) {
        children.forEach(child => this.app.tree.add(child))
    }
  }
  
  public get canUndo() {
      return this.undoStack.length > 1
  }
  
  public get canRedo() {
      return this.redoStack.length > 0
  }
}
