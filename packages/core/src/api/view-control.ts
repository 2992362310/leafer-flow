import type { IconName } from "./icon";

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
