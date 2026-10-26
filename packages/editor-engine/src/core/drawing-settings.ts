export type ConnectorRouteType = "orthogonal" | "bezier" | "straight";

let connectorRouteType: ConnectorRouteType = "orthogonal";
let freehandSmoothness = 1;
let snapEnabled = true;

export function setConnectorRouteType(type: ConnectorRouteType) {
  connectorRouteType = type;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("leafer-flow:connector-route-type-changed", {
        detail: { type },
      }),
    );
  }
}

export function setFreehandSmoothness(value: number) {
  freehandSmoothness = Math.max(0.5, Math.min(4, value));
}

export function getConnectorRouteType() {
  return connectorRouteType;
}

export function getFreehandSmoothness() {
  return freehandSmoothness;
}

export function setSnapEnabled(value: boolean) {
  snapEnabled = value;
}

export function getSnapEnabled() {
  return snapEnabled;
}
