import { ref } from "vue";

export type ConnectorRouteType = "orthogonal" | "bezier" | "straight";

const connectorRouteType = ref<ConnectorRouteType>("orthogonal");
const freehandSmoothness = ref(1);
const snapEnabled = ref(true);

export function useDrawingSettings() {
  return {
    connectorRouteType,
    freehandSmoothness,
    snapEnabled,
  };
}

export function setConnectorRouteType(type: ConnectorRouteType) {
  connectorRouteType.value = type;
}

export function setFreehandSmoothness(value: number) {
  freehandSmoothness.value = Math.max(0.5, Math.min(4, value));
}

export function getConnectorRouteType() {
  return connectorRouteType.value;
}

export function getFreehandSmoothness() {
  return freehandSmoothness.value;
}

export function setSnapEnabled(value: boolean) {
  snapEnabled.value = value;
}

export function getSnapEnabled() {
  return snapEnabled.value;
}
