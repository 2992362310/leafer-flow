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

export interface ActionButtonGroupContribution {
  id: string;
  label: string;
  icon: IconName;
  pluginId?: string;
  kind?: ActionButtonKind;
  order?: number;
  items: ActionButtonItemContribution[];
}
