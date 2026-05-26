import { App } from "leafer";
import {
  applySerializedChildren,
  serializeChildrenWithConnectors,
  type SerializedChild,
} from "./flow-serialization";

export class HistoryManager {
  private app: App;
  private undoStack: { data: SerializedChild[]; hash: string }[] = [];
  private redoStack: { data: SerializedChild[]; hash: string }[] = [];
  private lastSavedHash = "";
  private limit = 30;
  private isExecuting = false;

  constructor(app: App) {
    this.app = app;
    this.save();
  }

  public save() {
    if (this.isExecuting) return;

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

  private computeHash(data: SerializedChild[]): string {
    // Simple fast hash using JSON.stringify — avoids allocating a full string comparison
    // by comparing length first (cheap short-circuit for most cases)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `${str.length}:${hash}`;
  }
}
