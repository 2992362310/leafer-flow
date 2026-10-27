import { DocumentStore } from "../document/document-store";
import type { EditorDocument } from "../document/model";

export interface HistoryEntry {
  index: number;
  hash: string;
  label: string;
}

export class HistoryManager {
  private undoStack: { data: EditorDocument; hash: string }[] = [];
  private redoStack: { data: EditorDocument; hash: string }[] = [];
  private lastSavedHash = "";
  private limit = 30;
  private isExecuting = false;
  private transactionDepth = 0;

  private unsubscribe: () => void;

  constructor(private document: DocumentStore) {
    this.unsubscribe = document.subscribe((change) => {
      if (change.origin === "history") return;
      if (change.origin === "load") {
        this.undoStack = [];
        this.redoStack = [];
        this.lastSavedHash = "";
      }
      this.save();
    });
    this.save();
  }

  public save() {
    if (this.isExecuting) return;
    if (this.transactionDepth > 0) return; // 事务期间延迟保存

    const data = this.document.snapshot();
    const hash = JSON.stringify(data);

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
    try {
      const prev = this.undoStack[this.undoStack.length - 2];
      this.document.replace(prev.data, "history", "Undo");
      this.redoStack.push(this.undoStack.pop()!);
      this.lastSavedHash = prev.hash;
      return true;
    } finally {
      this.isExecuting = false;
    }
  }

  public redo() {
    if (this.redoStack.length === 0) return false;

    this.isExecuting = true;
    try {
      const next = this.redoStack[this.redoStack.length - 1];
      this.document.replace(next.data, "history", "Redo");
      this.redoStack.pop();
      this.undoStack.push(next);
      this.lastSavedHash = next.hash;
      return true;
    } finally {
      this.isExecuting = false;
    }
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
    try {
      const target = this.undoStack[targetIndex];
      this.document.replace(target.data, "history", "Jump to history");
      while (this.undoStack.length - 1 > targetIndex) {
        this.redoStack.push(this.undoStack.pop()!);
      }
      this.lastSavedHash = target.hash;
      return true;
    } finally {
      this.isExecuting = false;
    }
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

  dispose() {
    this.unsubscribe();
    this.undoStack = [];
    this.redoStack = [];
  }
}
