import { App } from "leafer";
import {
  deserializeTreeWithConnectors,
  serializeTreeWithConnectors,
} from "./flow-serialization";

const STORAGE_KEY = "leafer-flow-autosave";
const DEBOUNCE_MS = 1000;

export class AutoSave {
  private app: App;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: App) {
    this.app = app;
  }

  start() {
    this.app.tree.on("child.add", () => this.scheduleSave());
    this.app.tree.on("child.remove", () => this.scheduleSave());
    this.app.tree.on("clear", () => this.scheduleSave());

    if (this.app.editor) {
      this.app.editor.on("move.end", () => this.scheduleSave());
      this.app.editor.on("resize.end", () => this.scheduleSave());
      this.app.editor.on("rotate.end", () => this.scheduleSave());
    }
  }

  save() {
    try {
      const data = serializeTreeWithConnectors(this.app);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("自动保存失败:", error);
    }
  }

  load(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return false;

      const json = JSON.parse(data) as Record<string, unknown>;
      const children = json.children;
      if (!children || !Array.isArray(children) || children.length === 0) {
        return false;
      }

      deserializeTreeWithConnectors(this.app, json);
      return true;
    } catch (error) {
      console.warn("自动加载失败:", error);
      return false;
    }
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleSave() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), DEBOUNCE_MS);
  }
}
