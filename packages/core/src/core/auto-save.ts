import { DocumentStore } from "../document/document-store";
import type { ResourceService } from "../document/resources";
import { validateDocument } from "../document/model";

const STORAGE_KEY = "leafer-flow.document.v6";
const IDB_DB_NAME = "leafer-flow-documents";
const IDB_STORE_NAME = "autosave";
const IDB_KEY = "current";
const DEBOUNCE_MS = 1000;
const LOCALSTORAGE_SIZE_LIMIT = 3 * 1024 * 1024; // 3MB — localStorage 安全线

export class AutoSave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _lastSaveOk = true;
  private _saveError: string | null = null;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase | null>;
  private started = false;
  private disposed = false;
  private disposePromise?: Promise<void>;
  private cleanups: Array<() => void> = [];
  private saves = new Set<Promise<boolean>>();
  private writeQueue: Promise<boolean> = Promise.resolve(true);

  constructor(private document: DocumentStore, private resources?: ResourceService) {
    this.dbReady = this.openDB();
  }

  get lastSaveOk(): boolean {
    return this._lastSaveOk;
  }

  get saveError(): string | null {
    return this._saveError;
  }

  start() {
    if (this.started || this.disposed) return;
    this.started = true;
    this.cleanups.push(this.document.subscribe((change) => {
      if (change.origin !== "load") this.scheduleSave();
    }));
  }

  save(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    const json = JSON.stringify(this.document.snapshot());
    const task = this.writeQueue.then(() => this.persist(json));
    this.writeQueue = task;
    this.saves.add(task);
    void task.then(() => this.saves.delete(task));
    return task;
  }

  private async persist(json: string): Promise<boolean> {
    try {
      const sizeBytes = json.length * 2; // UTF-16

      // 小数据直接存 localStorage（快）
      if (sizeBytes <= LOCALSTORAGE_SIZE_LIMIT) {
        localStorage.setItem(STORAGE_KEY, json);
        this._lastSaveOk = true;
        this._saveError = null;
        return true;
      }

      // 大数据用 IndexedDB
      const db = await this.dbReady;
      if (!db) {
        this._saveError = "IndexedDB 不可用，数据过大无法自动保存";
        this._lastSaveOk = false;
        return false;
      }

      await this.idbPut(db, json);
      // 同时清掉 localStorage 里的旧数据，避免 load 时读到过期内容
      localStorage.removeItem(STORAGE_KEY);

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

  async load(): Promise<{ loaded: boolean }> {
    if (this.disposed) return { loaded: false };
    try {
      // 优先读 localStorage（快，且覆盖小文件场景）
      let raw = localStorage.getItem(STORAGE_KEY);

      // localStorage 没有则尝试 IndexedDB
      if (!raw) {
        const db = await this.dbReady;
        if (db && !this.disposed) {
          raw = await this.idbGet(db);
        }
      }

      if (!raw || this.disposed) return { loaded: false };
      const document = JSON.parse(raw);
      validateDocument(document);
      await this.resources?.hydrateAssets(document.assets);
      if (this.disposed) return { loaded: false };
      this.document.replace(document, "load", "Restore document");
      return { loaded: true };
    } catch (error) {
      console.warn("自动加载失败:", error);
      return { loaded: false };
    }
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    this.dbReady.then((db) => {
      if (db) {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        tx.objectStore(IDB_STORE_NAME).delete(IDB_KEY);
      }
    });
  }

  destroy(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      void this.save();
    }
    this.disposed = true;
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.disposePromise = (async () => {
      await Promise.allSettled([...this.saves]);
      const db = await this.dbReady;
      db?.close();
      this.db = null;
    })();
    return this.disposePromise;
  }

  private scheduleSave() {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.save();
    }, DEBOUNCE_MS);
  }

  // ---- IndexedDB ----

  private openDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }

      const request = indexedDB.open(IDB_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.warn("IndexedDB 打开失败:", request.error);
        resolve(null);
      };
    });
  }

  private idbPut(db: IDBDatabase, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).put(value, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private idbGet(db: IDBDatabase): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const request = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }
}
