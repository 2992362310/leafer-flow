import type { Component } from "vue";
import type { IUI } from "leafer";
import type { Text } from "leafer";
import type { Connector } from "leafer-connector";
import type Editor from "../editor";

export interface PropertyPanelContext {
  editor: Editor;
  selectedElement: IUI | null;
  selectedElements: IUI[];
  selectedShape: IUI | null;
  selectedText: Text | null;
  selectedConnector: Connector | null;
  selectedConnectorLabel: boolean;
  isMultiSelection: boolean;
  hasSelection: boolean;
  hasSelectedConnector: boolean;
}

export type PropertyFieldType = "text" | "textarea" | "number" | "color" | "checkbox" | "select";

export interface PropertyFieldOption<TValue = unknown> {
  label: string;
  value: TValue;
}

export interface PropertyFieldContribution<TValue = unknown> {
  key: string;
  label: string;
  type: PropertyFieldType;
  order?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: PropertyFieldOption<TValue>[];
  getValue(context: PropertyPanelContext): TValue;
  setValue(context: PropertyPanelContext, value: TValue): void;
}

export interface PropertyFieldPanelContribution {
  id: string;
  title: string;
  pluginId?: string;
  order?: number;
  match(context: PropertyPanelContext): boolean;
  fields: PropertyFieldContribution[];
}

export interface PropertyPanelContribution {
  id: string;
  title: string;
  pluginId?: string;
  order?: number;
  hideTitle?: boolean;
  fields?: PropertyFieldContribution[];
  component: Component;
  match(context: PropertyPanelContext): boolean;
}
