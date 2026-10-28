import { computed, inject, provide, ref, shallowRef, type InjectionKey } from "vue";

export type DockPanelId = string;

export interface DockPanelMeta {
  id: DockPanelId;
  label: string;
  icon: string;
}

const STORAGE_KEY = "leafer-flow-docked-panels";

const hostPanelMeta: Record<DockPanelId, DockPanelMeta> = {
  "shape-library": { id: "shape-library", label: "图形库", icon: "shapes" },
  "property-panel": { id: "property-panel", label: "属性", icon: "sliders" },
  "layer-panel": { id: "layer-panel", label: "图层", icon: "layer" },
  "action-bar": { id: "action-bar", label: "操作工具", icon: "toolbar" },
  "event-log": { id: "event-log", label: "事件日志", icon: "activity" },
  "status-bar": { id: "status-bar", label: "状态信息", icon: "info" },
};

export function createPanelDock() {
  const panelMetaMap = shallowRef(new Map(Object.entries(hostPanelMeta)));
  const dockedIds = ref<DockPanelId[]>([]);
  const activeFlyoutId = ref<DockPanelId | null>(null);
  let initialized = false;

  function isDockPanelId(value: string): value is DockPanelId {
    return typeof value === "string" && value.trim().length > 0;
  }

  function ensureInitialized() {
    if (initialized) return;
    initialized = true;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;
      dockedIds.value = parsed.filter((id) => isDockPanelId(id) && id !== "tool-manager");
      if (dockedIds.value.length !== parsed.length) persist();
    } catch (error) {
      console.warn("读取停靠面板状态失败", error);
    }
  }

  function persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dockedIds.value));
    } catch (error) {
      console.warn("保存停靠面板状态失败", error);
    }
  }

  ensureInitialized();

  const dockedPanels = computed(() => dockedIds.value.flatMap((id) => {
    const meta = panelMetaMap.value.get(id);
    return meta ? [meta] : [];
  }));

  function syncPanels(panels: DockPanelMeta[]) {
    const next = new Map(Object.entries(hostPanelMeta));
    for (const panel of panels) next.set(panel.id, panel);
    const removed = new Set([...panelMetaMap.value.keys()].filter((id) => !next.has(id)));
    panelMetaMap.value = next;
    if (removed.size) {
      dockedIds.value = dockedIds.value.filter((id) => !removed.has(id));
      if (activeFlyoutId.value && removed.has(activeFlyoutId.value)) activeFlyoutId.value = null;
      persist();
    }
  }

  function isPanelDocked(id: DockPanelId) {
    return dockedIds.value.includes(id);
  }

  function dockPanel(id: DockPanelId) {
    if (!panelMetaMap.value.has(id) || isPanelDocked(id)) return;
    dockedIds.value = [...dockedIds.value, id];
    // Keep the panel visible as a flyout after docking; otherwise it becomes "hidden".
    activeFlyoutId.value = id;
    persist();
  }

  function undockPanel(id: DockPanelId) {
    if (!isPanelDocked(id)) return;
    dockedIds.value = dockedIds.value.filter((item) => item !== id);
    if (activeFlyoutId.value === id) activeFlyoutId.value = null;
    persist();
  }

  function togglePanelDock(id: DockPanelId) {
    if (isPanelDocked(id)) {
      undockPanel(id);
      return;
    }
    dockPanel(id);
  }

  function moveDockedPanel(sourceId: DockPanelId, targetId: DockPanelId) {
    if (sourceId === targetId) return;
    const sourceIndex = dockedIds.value.indexOf(sourceId);
    const targetIndex = dockedIds.value.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...dockedIds.value];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    dockedIds.value = next;
    persist();
  }

  function toggleFlyout(id: DockPanelId) {
    if (!panelMetaMap.value.has(id) || !isPanelDocked(id)) return;
    activeFlyoutId.value = activeFlyoutId.value === id ? null : id;
  }

  function closeFlyout() {
    activeFlyoutId.value = null;
  }

  function isFlyoutOpen(id: DockPanelId) {
    return activeFlyoutId.value === id;
  }

  return {
    dockedPanels,
    syncPanels,
    activeFlyoutId,
    isPanelDocked,
    isFlyoutOpen,
    dockPanel,
    undockPanel,
    togglePanelDock,
    toggleFlyout,
    closeFlyout,
    moveDockedPanel,
  };
}

const PANEL_DOCK_KEY: InjectionKey<ReturnType<typeof createPanelDock>> = Symbol("panel-dock");

export function providePanelDock() {
  const dock = createPanelDock();
  provide(PANEL_DOCK_KEY, dock);
  return dock;
}

export function usePanelDock() {
  const dock = inject(PANEL_DOCK_KEY);
  if (!dock) throw new Error("usePanelDock requires an editor panel dock provider");
  return dock;
}

/** 返回面板当前渲染模式：float（浮动）| flyout（槽位弹出）| hidden（已收起，不渲染） */
export function usePanelMode(id: DockPanelId) {
  const { isPanelDocked, isFlyoutOpen } = usePanelDock();
  return computed((): "float" | "flyout" | "hidden" => {
    if (!isPanelDocked(id)) return "float";
    if (isFlyoutOpen(id)) return "flyout";
    return "hidden";
  });
}
