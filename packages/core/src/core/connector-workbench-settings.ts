import type Editor from "../editor";
import {
    getConnectorRouteType,
    setConnectorRouteType,
    type ConnectorRouteType,
} from "./drawing-settings";
import type { FlowDocumentSettings } from "./flow-serialization";

const CONNECTOR_ANIMATION_STORAGE_PREFIX = "leafer-flow.plugin.leafer-flow.connector-animation.";
const CONNECTOR_ANIMATION_ENABLED_KEY = `${CONNECTOR_ANIMATION_STORAGE_PREFIX}enabled`;
const CONNECTOR_ANIMATION_SPEED_KEY = `${CONNECTOR_ANIMATION_STORAGE_PREFIX}speed`;
const CONNECTOR_ANIMATION_SCOPE_KEY = `${CONNECTOR_ANIMATION_STORAGE_PREFIX}scope`;
const CONNECTOR_ANIMATION_DIRECTION_KEY = `${CONNECTOR_ANIMATION_STORAGE_PREFIX}direction`;

function isRouteType(value: unknown): value is ConnectorRouteType {
    return value === "orthogonal" || value === "bezier" || value === "straight";
}

function parseStorageValue<T>(raw: string | null): T | undefined {
    if (!raw) return undefined;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
}

function toAnimationScope(value: unknown): "all" | "selected" {
    return value === "selected" ? "selected" : "all";
}

function toAnimationDirection(value: unknown): "forward" | "reverse" {
    return value === "reverse" ? "reverse" : "forward";
}

function toAnimationSpeed(value: unknown): number {
    const speed = typeof value === "number" ? value : Number.NaN;
    if (!Number.isFinite(speed)) return 1;
    return Math.min(6, Math.max(0.2, speed));
}

export function getConnectorWorkbenchSettings(): FlowDocumentSettings {
    const enabled = Boolean(parseStorageValue<boolean>(localStorage.getItem(CONNECTOR_ANIMATION_ENABLED_KEY)));
    const speed = toAnimationSpeed(parseStorageValue<number>(localStorage.getItem(CONNECTOR_ANIMATION_SPEED_KEY)));
    const scope = toAnimationScope(parseStorageValue<unknown>(localStorage.getItem(CONNECTOR_ANIMATION_SCOPE_KEY)));
    const direction = toAnimationDirection(
        parseStorageValue<unknown>(localStorage.getItem(CONNECTOR_ANIMATION_DIRECTION_KEY)),
    );

    return {
        connectorRouteType: getConnectorRouteType(),
        connectorFlowAnimation: {
            enabled,
            speed,
            scope,
            direction,
        },
    };
}

export async function applyConnectorWorkbenchSettings(
    editor: Editor,
    settings?: FlowDocumentSettings,
): Promise<void> {
    if (!settings) return;

    if (isRouteType(settings.connectorRouteType)) {
        setConnectorRouteType(settings.connectorRouteType);
    }

    const animation = settings.connectorFlowAnimation;
    if (!animation) return;

    if (editor.commands.has("setConnectorFlowAnimationSpeed")) {
        await editor.commands.execute("setConnectorFlowAnimationSpeed", {
            speed: toAnimationSpeed(animation.speed),
        });
    }

    if (editor.commands.has("setConnectorFlowAnimationScope")) {
        await editor.commands.execute("setConnectorFlowAnimationScope", {
            scope: toAnimationScope(animation.scope),
        });
    }

    if (editor.commands.has("setConnectorFlowAnimationDirection")) {
        await editor.commands.execute("setConnectorFlowAnimationDirection", {
            direction: toAnimationDirection(animation.direction),
        });
    }

    if (editor.commands.has("setConnectorFlowAnimationEnabled")) {
        await editor.commands.execute("setConnectorFlowAnimationEnabled", {
            enabled: Boolean(animation.enabled),
        });
    }
}
