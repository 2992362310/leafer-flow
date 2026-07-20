import type { IconName } from "../../assets/icons";
import type { PanelToggleId } from "./panel-toggle";

/** `dropdown` is treated as `panel` (kept for backward compatibility). */
export type ActionButtonKind = "button" | "dropdown" | "panel";

/** file / edit / arrange = toolbar sections; panel = toggle/open UI panels */
export type ActionButtonSurface = "file" | "edit" | "arrange" | "panel";

/** How action items inside a popup panel are laid out. */
export type ActionButtonMenuLayout = "list" | "grid";

export interface ActionButtonItemContribution {
  id: string;
  label: string;
  command: string;
  icon?: IconName;
  order?: number;
  danger?: boolean;
  /** Optional section title inside popup panels. */
  section?: string;
  /** When set, ActionBar can highlight the button if this panel is open or docked. */
  panelId?: PanelToggleId;
}

export interface ActionButtonSelectOption<T extends string | boolean = string | boolean> {
  value: T;
  label: string;
}

export interface ActionButtonSelectSettingContribution<
  T extends string | boolean = string | boolean,
> {
  id: string;
  label: string;
  kind: "select";
  options: ActionButtonSelectOption<T>[];
  getValue: () => T;
  setValue: (value: T) => void;
  order?: number;
}

export interface ActionButtonRangeSettingContribution {
  id: string;
  label: string;
  kind: "range";
  min: number;
  max: number;
  step: number;
  getValue: () => number;
  setValue: (value: number) => void;
  formatValue?: (value: number) => string;
  order?: number;
}

export type ActionButtonPanelItemContribution =
  | ActionButtonSelectSettingContribution
  | ActionButtonRangeSettingContribution;

export interface ActionButtonGroupContribution {
  id: string;
  label: string;
  icon: IconName;
  pluginId?: string;
  kind?: ActionButtonKind;
  /** Defaults to "edit" when omitted. */
  surface?: ActionButtonSurface;
  /** Action-item layout inside popup panels. Defaults to "list". */
  menuLayout?: ActionButtonMenuLayout;
  order?: number;
  items: ActionButtonItemContribution[];
  panelItems?: ActionButtonPanelItemContribution[];
}
