import { App } from "leafer";
import {
  applySerializedChildren,
  serializeChildrenWithConnectors,
  type SerializedChild,
} from "./flow-serialization";

export interface HistoryEntry {
  index: number;
  hash: string;
  label: string;
}

export class HistoryManager {
  private app: App;
  private undoStack: { data: SerializedChild[]; hash: string }[] = [];
  private redoStack: { data: SerializedChild[]; hash: string }[] = [];
  private lastSavedHash = "";
  private limit = 30;
  private isExecuting = false;
  private transactionDepth = 0;

  constructor(app: App) {
    this.app = app;
    this.save();
  }

  public save() {
    if (this.isExecuting) return;
    if (this.transactionDepth > 0) return; // 事务期间延迟保存

    const data = serializeChildrenWithConnectors(this.app);
    const hash = this.computeHash(data);

    if (hash === this.lastSavedHash) return;

    this.undoStack.push({ data, hash });
    this.lastSavedHash = hash;

    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  public undo() {
    if (this.undoStack.length < 2) return false;

    this.isExecuting = true;

    const current = this.undoStack.pop();
    if (current) this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.lastSavedHash = prev.hash;
    applySerializedChildren(this.app, prev.data);

    this.isExecuting = false;
    return true;
  }

  public redo() {
    if (this.redoStack.length === 0) return false;

    this.isExecuting = true;

    const next = this.redoStack.pop();
    if (!next) {
      this.isExecuting = false;
      return false;
    }

    this.undoStack.push(next);
    this.lastSavedHash = next.hash;
    applySerializedChildren(this.app, next.data);

    this.isExecuting = false;
    return true;
  }

  public get canUndo() {
    return this.undoStack.length > 1;
  }

  public get canRedo() {
    return this.redoStack.length > 0;
  }

  public get undoCount() {
    return this.undoStack.length;
  }

  public get redoCount() {
    return this.redoStack.length;
  }

  /** 获取历史条目列表，用于 UI 展示 */
  public getEntries(): HistoryEntry[] {
    const entries: HistoryEntry[] = [];
    this.undoStack.forEach((item, i) => {
      entries.push({ index: i, hash: item.hash, label: `状态 ${i + 1}` });
    });
    return entries;
  }

  /** 跳转到指定历史状态（通过撤销/重做到达） */
  public jumpTo(targetIndex: number): boolean {
    if (targetIndex < 0 || targetIndex >= this.undoStack.length) return false;
    if (targetIndex === this.undoStack.length - 1) return true; // 已经在目标位置

    this.isExecuting = true;

    // 需要撤销到目标位置
    while (this.undoStack.length - 1 > targetIndex) {
      const current = this.undoStack.pop();
      if (current) this.redoStack.push(current);
    }

    const target = this.undoStack[this.undoStack.length - 1];
    if (target) {
      this.lastSavedHash = target.hash;
      applySerializedChildren(this.app, target.data);
    }

    this.isExecuting = false;
    return true;
  }

  /** 开始事务：事务期间的 save() 调用会被延迟到 endTransaction() */
  public beginTransaction() {
    this.transactionDepth++;
  }

  /** 结束事务：提交一次 save() */
  public endTransaction() {
    if (this.transactionDepth > 0) {
      this.transactionDepth--;
      if (this.transactionDepth === 0) {
        this.save();
      }
    }
  }

  private computeHash(data: SerializedChild[]): string {
    // 快速结构化哈希：用元素数量 + 位置/尺寸累加 + 标签采样，避免完整 JSON.stringify
    let posSum = 0;
    let sizeSum = 0;
    let tagHash = 0;
    const len = data.length;

    for (let i = 0; i < len; i++) {
      const el = data[i] as Record<string, unknown>;
      posSum += ((el.x as number) || 0) + ((el.y as number) || 0);
      sizeSum += ((el.width as number) || 0) + ((el.height as number) || 0);

      // 采样标签哈希（每隔几个元素）
      if (i % 3 === 0) {
        const tag = String(el.tag || "");
        for (let j = 0; j < tag.length; j++) {
          tagHash = ((tagHash << 5) - tagHash + tag.charCodeAt(j)) | 0;
        }
      }
    }

    return `${len}:${Math.round(posSum)}:${Math.round(sizeSum)}:${tagHash}`;
  }
}
