import type { IconName } from "../../assets/icons";

export type ActionButtonKind = "button" | "dropdown" | "panel";

export interface ActionButtonItemContribution {
  id: string;
  label: string;
  command: string;
  icon?: IconName;
  order?: number;
  danger?: boolean;
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
  order?: number;
  items: ActionButtonItemContribution[];
  panelItems?: ActionButtonPanelItemContribution[];
}
