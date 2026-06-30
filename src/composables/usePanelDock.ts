import { computed, ref } from "vue";
import type { IconName } from "@/assets/icons";

export type DockPanelId =
    | "shape-library"
    | "property-panel"
    | "layer-panel"
    | "action-bar"
    | "event-log"
    | "canvas-search"
    | "history-panel"
    | "plugin-market"
    | "agent-chat"
    | "minimap-panel"
    | "multi-layer-panel"
    | "diagram-lint"
    | "shortcut-help";

interface DockPanelMeta {
    id: DockPanelId;
    label: string;
    icon: IconName;
}

const STORAGE_KEY = "leafer-flow-docked-panels";

const panelMetaMap: Record<DockPanelId, DockPanelMeta> = {
    "shape-library": { id: "shape-library", label: "图形库", icon: "template" },
    "property-panel": { id: "property-panel", label: "属性", icon: "layer" },
    "layer-panel": { id: "layer-panel", label: "图层", icon: "layer" },
    "action-bar": { id: "action-bar", label: "操作工具", icon: "toolbar" },
    "event-log": { id: "event-log", label: "事件日志", icon: "info" },
    "canvas-search": { id: "canvas-search", label: "搜索", icon: "select" },
    "history-panel": { id: "history-panel", label: "历史", icon: "undo" },
    "plugin-market": { id: "plugin-market", label: "插件市场", icon: "plugin" },
    "agent-chat": { id: "agent-chat", label: "AI 助手", icon: "agent" },
    "minimap-panel": { id: "minimap-panel", label: "缩略图", icon: "visible" },
    "multi-layer-panel": { id: "multi-layer-panel", label: "多图层", icon: "layer" },
    "diagram-lint": { id: "diagram-lint", label: "规范检查", icon: "warning" },
    "shortcut-help": { id: "shortcut-help", label: "快捷键", icon: "info" },
};

const dockedIds = ref<DockPanelId[]>([]);
const activeFlyoutId = ref<DockPanelId | null>(null);
let initialized = false;

function isDockPanelId(value: string): value is DockPanelId {
    return value in panelMetaMap;
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
        dockedIds.value = parsed.filter(isDockPanelId);
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

export function usePanelDock() {
    ensureInitialized();

    const dockedPanels = computed(() => dockedIds.value.map((id) => panelMetaMap[id]));

    function isPanelDocked(id: DockPanelId) {
        return dockedIds.value.includes(id);
    }

    function dockPanel(id: DockPanelId) {
        if (isPanelDocked(id)) return;
        dockedIds.value = [...dockedIds.value, id];
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

/** 返回面板当前渲染模式：float（浮动）| flyout（槽位弹出）| hidden（已收起，不渲染） */
export function usePanelMode(id: DockPanelId) {
    const { isPanelDocked, isFlyoutOpen } = usePanelDock();
    return computed((): "float" | "flyout" | "hidden" => {
        if (!isPanelDocked(id)) return "float";
        if (isFlyoutOpen(id)) return "flyout";
        return "hidden";
    });
}
