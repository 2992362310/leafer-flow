import { App } from "leafer";
import { deserializeTreeWithConnectors, serializeTreeWithConnectors } from "./flow-serialization";

const STORAGE_KEY = "leafer-flow-autosave";
const DEBOUNCE_MS = 1000;
const SIZE_WARNING_KEY = "leafer-flow-autosave-warning";
const SIZE_WARNING_COOLDOWN_MS = 60_000; // Show warning at most once per minute

export class AutoSave {
  private app: App;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _lastSaveOk = true;
  private _saveError: string | null = null;

  constructor(app: App) {
    this.app = app;
  }

  /** Whether the last save succeeded. */
  get lastSaveOk(): boolean {
    return this._lastSaveOk;
  }

  /** Error message from the last save failure, if any. */
  get saveError(): string | null {
    return this._saveError;
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

  save(): boolean {
    try {
      const data = serializeTreeWithConnectors(this.app);
      const json = JSON.stringify(data);

      // Estimate size in MB (2 bytes per char for UTF-16)
      const sizeMB = (json.length * 2) / (1024 * 1024);
      if (sizeMB > 4) {
        const lastWarning = Number(localStorage.getItem(SIZE_WARNING_KEY) || "0");
        if (Date.now() - lastWarning > SIZE_WARNING_COOLDOWN_MS) {
          this._saveError = `自动保存数据较大（${sizeMB.toFixed(1)}MB），建议手动保存文件`;
          this._lastSaveOk = false;
          localStorage.setItem(SIZE_WARNING_KEY, String(Date.now()));
          console.warn(this._saveError);
          return false;
        }
      }

      localStorage.setItem(STORAGE_KEY, json);
      this._lastSaveOk = true;
      this._saveError = null;
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "未知错误";
      if (msg.includes("quota") || msg.includes("QuotaExceededError") || msg.includes("exceeded")) {
        this._saveError = "自动保存空间不足，请手动保存文件（Ctrl+S）";
      } else {
        this._saveError = `自动保存失败: ${msg}`;
      }
      this._lastSaveOk = false;
      console.warn(this._saveError);
      return false;
    }
  }

  load(): { loaded: boolean; failedConnectors: number } {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return { loaded: false, failedConnectors: 0 };

      const json = JSON.parse(data) as Record<string, unknown>;
      const children = json.children;
      if (!children || !Array.isArray(children) || children.length === 0) {
        return { loaded: false, failedConnectors: 0 };
      }

      const result = deserializeTreeWithConnectors(this.app, json);
      return { loaded: true, failedConnectors: result.failedConnectors };
    } catch (error) {
      console.warn("自动加载失败:", error);
      return { loaded: false, failedConnectors: 0 };
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
