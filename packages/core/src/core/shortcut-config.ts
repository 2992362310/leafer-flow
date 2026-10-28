import { ACTION_NAME } from "../constants";
import { buildDefaultToolShortcutEntries } from "./tool-shortcuts";

const STORAGE_KEY = "leafer-flow-shortcuts";
export const SHORTCUT_CONFIG_CHANGED_EVENT = "leafer-flow:shortcuts-changed";

export interface ShortcutEntry {
  key: string;
  action: string;
  type: "action" | "tool";
}

// 默认快捷键映射
const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  // 通用操作
  { key: "ctrl+z", action: ACTION_NAME.UNDO, type: "action" },
  { key: "ctrl+shift+z", action: ACTION_NAME.REDO, type: "action" },
  { key: "ctrl+s", action: ACTION_NAME.SAVE, type: "action" },
  { key: "ctrl+a", action: ACTION_NAME.SELECT_ALL, type: "action" },
  { key: "ctrl+f", action: ACTION_NAME.FIND, type: "action" },
  { key: "ctrl+c", action: ACTION_NAME.COPY, type: "action" },
  { key: "ctrl+x", action: ACTION_NAME.CUT, type: "action" },
  { key: "ctrl+v", action: ACTION_NAME.PASTE, type: "action" },
  { key: "ctrl+d", action: ACTION_NAME.DUPLICATE, type: "action" },
  { key: "ctrl+g", action: ACTION_NAME.GROUP, type: "action" },
  { key: "ctrl+shift+g", action: ACTION_NAME.UNGROUP, type: "action" },
  { key: "ctrl+]", action: ACTION_NAME.BRING_FORWARD, type: "action" },
  { key: "ctrl+[", action: ACTION_NAME.SEND_BACKWARD, type: "action" },
  { key: "ctrl+shift+}", action: ACTION_NAME.BRING_TO_FRONT, type: "action" },
  { key: "ctrl+shift+{", action: ACTION_NAME.SEND_TO_BACK, type: "action" },
  { key: "ctrl+shift+l", action: ACTION_NAME.LOCK_SELECTED, type: "action" },
  { key: "ctrl+l", action: ACTION_NAME.UNLOCK_SELECTED, type: "action" },
  { key: "ctrl+u", action: ACTION_NAME.UNLOCK_ALL, type: "action" },
  { key: "ctrl+h", action: ACTION_NAME.TOGGLE_VISIBLE, type: "action" },
  { key: "ctrl+shift+c", action: ACTION_NAME.FORMAT_PAINTER_COPY, type: "action" },
  { key: "ctrl+shift+v", action: ACTION_NAME.FORMAT_PAINTER_APPLY, type: "action" },
  { key: "delete", action: ACTION_NAME.DELETE, type: "action" },
  { key: "backspace", action: ACTION_NAME.DELETE, type: "action" },
  { key: "f1", action: "toggleShortcutHelp", type: "action" },
  { key: "ctrl+shift+a", action: "openAgent", type: "action" },

  // 工具快捷键（与 tool-shortcuts / toolbar tip 同源）
  ...buildDefaultToolShortcutEntries(),
];

export class ShortcutConfig {
  private shortcuts: ShortcutEntry[];
  private keyToAction = new Map<string, ShortcutEntry>();
  private actionToKey = new Map<string, string>();
  private toolDefaults = new Map<string, string>();

  constructor() {
    this.shortcuts = this.loadFromStorage();
    this.rebuildMaps();
  }

  /** 获取所有快捷键配置 */
  getAll(): ShortcutEntry[] {
    return [...this.shortcuts];
  }

  /** 获取某个快捷键对应的条目 */
  getByKey(key: string): ShortcutEntry | undefined {
    return this.keyToAction.get(key);
  }

  /** 获取某个操作对应的快捷键 */
  getByAction(action: string): string | undefined {
    return this.actionToKey.get(action);
  }

  ensureToolShortcut(action: string, defaultKey?: string): void {
    if (!defaultKey) return;
    this.toolDefaults.set(action, defaultKey.toLowerCase());
    if (this.shortcuts.some((shortcut) => shortcut.action === action)) return;

    const key = defaultKey.toLowerCase();
    if (key && this.keyToAction.has(key)) return;
    this.shortcuts.push({ key, action, type: "tool" });
    this.rebuildMaps();
  }

  /** 更新某个操作的快捷键 */
  setShortcut(action: string, newKey: string): boolean {
    // 检查新快捷键是否已被其他操作占用
    const existing = this.keyToAction.get(newKey);
    if (existing && existing.action !== action) {
      return false; // 已被占用
    }

    let entry = this.shortcuts.find((shortcut) => shortcut.action === action);
    if (!entry) {
      entry = { key: newKey, action, type: "tool" };
      this.shortcuts.push(entry);
      this.keyToAction.set(newKey, entry);
      this.actionToKey.set(action, newKey);
      this.saveToStorage();
      if (typeof window !== "undefined") window.dispatchEvent(new Event(SHORTCUT_CONFIG_CHANGED_EVENT));
      return true;
    }

    // 移除旧映射
    if (entry.key) this.keyToAction.delete(entry.key);
    this.actionToKey.delete(action);

    // 设置新映射
    entry.key = newKey;
    this.keyToAction.set(newKey, entry);
    this.actionToKey.set(action, newKey);

    this.saveToStorage();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SHORTCUT_CONFIG_CHANGED_EVENT));
    return true;
  }

  /** 重置为默认快捷键 */
  resetToDefaults(): void {
    this.shortcuts = [...DEFAULT_SHORTCUTS];
    const actions = new Set(this.shortcuts.map((shortcut) => shortcut.action));
    for (const [action, key] of this.toolDefaults) {
      if (actions.has(action)) continue;
      if (key && this.shortcuts.some((shortcut) => shortcut.key === key)) continue;
      this.shortcuts.push({ key, action, type: "tool" });
      actions.add(action);
    }
    this.rebuildMaps();
    this.saveToStorage();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SHORTCUT_CONFIG_CHANGED_EVENT));
  }

  private rebuildMaps(): void {
    this.keyToAction.clear();
    this.actionToKey.clear();
    for (const entry of this.shortcuts) {
      if (!entry.key) continue;
      this.keyToAction.set(entry.key, entry);
      if (!this.actionToKey.has(entry.action)) this.actionToKey.set(entry.action, entry.key);
    }
  }

  private loadFromStorage(): ShortcutEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShortcutEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validEntries = parsed.filter((entry): entry is ShortcutEntry =>
            Boolean(entry) && typeof entry.action === "string" && typeof entry.key === "string"
            && Boolean(entry.key) && (entry.type === "action" || entry.type === "tool"),
          );
          if (validEntries.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validEntries));
          }
          return validEntries;
        }
      }
    } catch {
      // 忽略解析错误
    }
    return [...DEFAULT_SHORTCUTS];
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.shortcuts));
    } catch {
      // 忽略存储错误
    }
  }
}

// 单例
let instance: ShortcutConfig | null = null;

export function getShortcutConfig(): ShortcutConfig {
  if (!instance) {
    instance = new ShortcutConfig();
  }
  return instance;
}
