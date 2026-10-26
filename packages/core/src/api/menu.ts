import type Editor from "../editor";

export interface MenuContribution {
  id: string;
  label: string;
  command: string;
  pluginId?: string;
  group?: string;
  order?: number;
  shortcut?: string;
  danger?: boolean;
  when?: (editor: Editor) => boolean;
}

export interface MenuGroupContribution {
  id: string;
  items: MenuContribution[];
}
