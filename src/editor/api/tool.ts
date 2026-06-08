import type { IconName } from "../../assets/icons";
import type { IEditorTool } from "../types";

export type ToolContributionGroup = "core" | "basic" | "flow" | "bpmn" | "architecture" | string;

export interface ToolLibraryContribution {
  groupId: ToolContributionGroup;
  groupTitle?: string;
  icon: IconName;
  keywords?: string[];
  width?: number;
  height?: number;
}

export interface ToolToolbarContribution {
  groupId: ToolContributionGroup;
  groupTitle?: string;
  icon: IconName;
  tip?: string;
  shortcut?: string;
  order?: number;
}

export interface ToolToolbarItem {
  tool: string;
  icon: IconName;
  tip: string;
  shortcut?: string;
  order?: number;
}

export interface ToolToolbarGroup {
  id: string;
  title: string;
  items: ToolToolbarItem[];
}

export interface ToolContribution {
  id: string;
  label: string;
  pluginId?: string;
  order?: number;
  createTool: () => IEditorTool;
  library?: ToolLibraryContribution;
  toolbar?: ToolToolbarContribution;
}

export interface RegisteredToolContribution extends ToolContribution {
  tool: IEditorTool;
}
