import { App } from "leafer";
import {
  applySerializedChildren,
  serializeChildrenWithConnectors,
  type SerializedChild,
} from "./flow-serialization";

export class HistoryManager {
  private app: App;
  private undoStack: SerializedChild[][] = [];
  private redoStack: SerializedChild[][] = [];
  private limit = 20;
  private isExecuting = false;

  constructor(app: App) {
    this.app = app;
    this.save();
  }

  public save() {
    if (this.isExecuting) return;

    const data = serializeChildrenWithConnectors(this.app);
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(data)) return;

    this.undoStack.push(data);
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
    applySerializedChildren(this.app, prev);

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
    applySerializedChildren(this.app, next);

    this.isExecuting = false;
    return true;
  }

  public get canUndo() {
    return this.undoStack.length > 1;
  }

  public get canRedo() {
    return this.redoStack.length > 0;
  }
}
