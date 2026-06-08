import type { IconName } from "../../assets/icons";

export interface ViewControlContribution {
  id: string;
  label: string;
  command: string;
  pluginId?: string;
  icon?: IconName;
  text?: string;
  order?: number;
  zoomLabel?: boolean;
}
