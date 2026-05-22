import { Text, type App, type IUI } from "leafer";
import { Connector } from "leafer-connector";

export const CONNECTOR_LABEL_PROP = "__connectorLabelFor";
export const CONNECTOR_LABEL_OFFSET_X_PROP = "__connectorLabelOffsetX";
export const CONNECTOR_LABEL_OFFSET_Y_PROP = "__connectorLabelOffsetY";

type ConnectorLabel = Text & {
  [CONNECTOR_LABEL_PROP]?: string | number;
  [CONNECTOR_LABEL_OFFSET_X_PROP]?: number;
  [CONNECTOR_LABEL_OFFSET_Y_PROP]?: number;
};

export function getConnectorLabelTarget(label: IUI): string | number | undefined {
  const connectorLabel = label as ConnectorLabel;
  return connectorLabel[CONNECTOR_LABEL_PROP];
}

export function createConnectorLabel(connector: Connector): ConnectorLabel {
  const position = getConnectorCenter(connector);
  const label = new Text({
    x: position.x - 18,
    y: position.y - 10,
    width: 36,
    height: 20,
    text: "标签",
    editable: true,
    fill: "#1f2937",
    fontSize: 12,
    textAlign: "center",
    verticalAlign: "middle",
    padding: 2,
    around: "white",
    name: "连接线标签",
  }) as ConnectorLabel;

  label[CONNECTOR_LABEL_PROP] = connector.innerId;
  label[CONNECTOR_LABEL_OFFSET_X_PROP] = 0;
  label[CONNECTOR_LABEL_OFFSET_Y_PROP] = 0;
  return label;
}

export function syncConnectorLabels(app: App) {
  const { connectors, labels } = collectConnectorLabels(app);

  labels.forEach((label) => {
    const connectorId = label[CONNECTOR_LABEL_PROP];
    if (!connectorId) return;

    const connector = connectors.get(connectorId);
    if (!connector) return;

    const center = getConnectorCenter(connector);
    const offsetX = label[CONNECTOR_LABEL_OFFSET_X_PROP] || 0;
    const offsetY = label[CONNECTOR_LABEL_OFFSET_Y_PROP] || 0;
    label.x = center.x + offsetX - (label.width || 36) / 2;
    label.y = center.y + offsetY - (label.height || 20) / 2;
  });
}

export function captureSelectedConnectorLabelOffsets(app: App) {
  const selected = (app.editor?.list || []) as IUI[];
  if (!selected.length) return;

  const { connectors } = collectConnectorLabels(app);
  selected.forEach((item) => {
    const label = item as ConnectorLabel;
    if (!(label instanceof Text) || !label[CONNECTOR_LABEL_PROP]) return;

    const connector = connectors.get(label[CONNECTOR_LABEL_PROP]);
    if (!connector) return;

    const center = getConnectorCenter(connector);
    const labelCenterX = (label.x || 0) + (label.width || 36) / 2;
    const labelCenterY = (label.y || 0) + (label.height || 20) / 2;
    label[CONNECTOR_LABEL_OFFSET_X_PROP] = labelCenterX - center.x;
    label[CONNECTOR_LABEL_OFFSET_Y_PROP] = labelCenterY - center.y;
  });
}

export function persistConnectorLabel(child: IUI, json: Record<string, unknown>) {
  const label = child as ConnectorLabel;
  if (label instanceof Text && label[CONNECTOR_LABEL_PROP]) {
    json[CONNECTOR_LABEL_PROP] = label[CONNECTOR_LABEL_PROP];
    json[CONNECTOR_LABEL_OFFSET_X_PROP] = label[CONNECTOR_LABEL_OFFSET_X_PROP] || 0;
    json[CONNECTOR_LABEL_OFFSET_Y_PROP] = label[CONNECTOR_LABEL_OFFSET_Y_PROP] || 0;
  }
}

export function restoreConnectorLabelRuntimeProps(
  node: IUI | undefined,
  data: Record<string, unknown>,
) {
  if (!node || !data[CONNECTOR_LABEL_PROP]) return;

  const label = node as ConnectorLabel;
  label[CONNECTOR_LABEL_PROP] = data[CONNECTOR_LABEL_PROP] as string | number;
  label[CONNECTOR_LABEL_OFFSET_X_PROP] =
    typeof data[CONNECTOR_LABEL_OFFSET_X_PROP] === "number"
      ? data[CONNECTOR_LABEL_OFFSET_X_PROP]
      : 0;
  label[CONNECTOR_LABEL_OFFSET_Y_PROP] =
    typeof data[CONNECTOR_LABEL_OFFSET_Y_PROP] === "number"
      ? data[CONNECTOR_LABEL_OFFSET_Y_PROP]
      : 0;
}

export function findSelectedConnector(list: IUI[]): Connector | null {
  for (const item of list) {
    if (item instanceof Connector) return item;
  }
  return null;
}

function collectConnectorLabels(app: App) {
  const connectors = new Map<string | number, Connector>();
  const labels: ConnectorLabel[] = [];

  app.tree.children?.forEach((child) => {
    if (child instanceof Connector) {
      connectors.set(child.innerId, child);
      return;
    }

    const label = child as ConnectorLabel;
    if (label instanceof Text && label[CONNECTOR_LABEL_PROP]) {
      labels.push(label);
    }
  });

  return { connectors, labels };
}

function getConnectorCenter(connector: Connector) {
  const points = connector.getPoints();
  if (points?.from && points?.to) {
    return {
      x: (points.from.x + points.to.x) / 2,
      y: (points.from.y + points.to.y) / 2,
    };
  }

  const bounds = connector.getBounds("box", "page");
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}
