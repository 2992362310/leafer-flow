import { inject, provide, type InjectionKey } from "vue";
import { usePanelDock } from "../composables/usePanelDock";
import type { PagePanelId } from "./panels";

interface PanelState {
  hasPanel(id: PagePanelId): boolean;
  isPanelOpen(id: PagePanelId): boolean;
  togglePanel(id: PagePanelId): void;
  openPanel(id: PagePanelId): void;
  closePanel(id: PagePanelId): void;
}

export interface PanelVisibility {
  has(id: PagePanelId): boolean;
  isDocked(id: PagePanelId): boolean;
  isFloatOpen(id: PagePanelId): boolean;
  isMounted(id: PagePanelId): boolean;
  shouldShowFloat(id: PagePanelId): boolean;
  toggle(id: PagePanelId): void;
  open(id: PagePanelId): void;
  closeFloat(id: PagePanelId): void;
}

export const PANEL_VISIBILITY_KEY: InjectionKey<PanelVisibility> = Symbol("panel-visibility");

export function usePanelVisibility(state: PanelState, dock = usePanelDock()): PanelVisibility {
  const { isPanelDocked, isFlyoutOpen, toggleFlyout, closeFlyout } = dock;

  function isDocked(id: PagePanelId) {
    return isPanelDocked(id);
  }

  function isFloatOpen(id: PagePanelId) {
    return state.isPanelOpen(id);
  }

  function isMounted(id: PagePanelId) {
    return isDocked(id) || isFloatOpen(id);
  }

  function shouldShowFloat(id: PagePanelId) {
    return isFloatOpen(id);
  }

  function toggle(id: PagePanelId) {
    if (isPanelDocked(id)) {
      toggleFlyout(id);
      return;
    }
    state.togglePanel(id);
  }

  function open(id: PagePanelId) {
    if (isPanelDocked(id)) {
      if (!isFlyoutOpen(id)) toggleFlyout(id);
      return;
    }
    state.openPanel(id);
  }

  function closeFloat(id: PagePanelId) {
    if (isPanelDocked(id)) {
      if (isFlyoutOpen(id)) closeFlyout();
      return;
    }
    state.closePanel(id);
  }

  return {
    has: state.hasPanel,
    isDocked,
    isFloatOpen,
    isMounted,
    shouldShowFloat,
    toggle,
    open,
    closeFloat,
  };
}

export function providePanelVisibility(state: PanelState, dock?: ReturnType<typeof usePanelDock>) {
  const visibility = usePanelVisibility(state, dock);
  provide(PANEL_VISIBILITY_KEY, visibility);
  return visibility;
}

export function useInjectedPanelVisibility() {
  const visibility = inject(PANEL_VISIBILITY_KEY);
  if (!visibility) {
    throw new Error("useInjectedPanelVisibility must be used within editor page");
  }
  return visibility;
}
