import type { IconName } from "../../assets/icons";
import type { PanelToggleId } from "./panel-toggle";

export type ActionButtonKind = "button" | "dropdown" | "panel";

/** edit = mutate/file/export; panel = toggle/open UI panels */
export type ActionButtonSurface = "edit" | "panel";

export interface ActionButtonItemContribution {
  id: string;
  label: string;
  command: string;
  icon?: IconName;
  order?: number;
  danger?: boolean;
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
  order?: number;
  items: ActionButtonItemContribution[];
  panelItems?: ActionButtonPanelItemContribution[];
}
