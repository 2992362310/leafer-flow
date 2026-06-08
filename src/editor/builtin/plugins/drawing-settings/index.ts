import type { ActionButtonGroupContribution } from "../../../api/action-button";
import type { EditorPluginModule } from "../../../api/plugin";
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
  type ConnectorRouteType,
} from "../../../core/drawing-settings";

const PLUGIN_ID = "leafer-flow.drawing-settings";

const DRAWING_SETTINGS_PANEL: ActionButtonGroupContribution = {
  id: "drawing-settings",
  label: "绘制设置",
  icon: "template",
  pluginId: PLUGIN_ID,
  kind: "panel",
  order: 75,
  items: [],
  panelItems: [
    {
      id: "connector-route-type",
      label: "连线样式",
      kind: "select",
      options: [
        { value: "orthogonal", label: "直角线" },
        { value: "bezier", label: "曲线" },
        { value: "straight", label: "直线" },
      ],
      getValue: getConnectorRouteType,
      setValue: (value) => setConnectorRouteType(value as ConnectorRouteType),
      order: 10,
    },
    {
      id: "freehand-smoothness",
      label: "自由绘制平滑度",
      kind: "range",
      min: 0.5,
      max: 4,
      step: 0.5,
      getValue: getFreehandSmoothness,
      setValue: setFreehandSmoothness,
      formatValue: (value) => value.toFixed(1),
      order: 20,
    },
    {
      id: "snap-enabled",
      label: "吸附",
      kind: "select",
      options: [
        { value: true, label: "开启吸附" },
        { value: false, label: "关闭吸附" },
      ],
      getValue: getSnapEnabled,
      setValue: (value) => setSnapEnabled(Boolean(value)),
      order: 30,
    },
  ],
};

export const drawingSettingsPlugin: EditorPluginModule = {
  manifest: {
    id: PLUGIN_ID,
    name: "绘制设置",
    version: "1.0.0",
    description: "提供连线样式、自由绘制平滑度和吸附开关设置面板。",
    category: "panel",
    capabilities: ["action-button", "settings"],
    enabledByDefault: true,
  },
  contributes: {
    buttons: ["绘制设置面板"],
  },
  activate(ctx) {
    ctx.editor.actionButtons.register(DRAWING_SETTINGS_PANEL);
  },
};
