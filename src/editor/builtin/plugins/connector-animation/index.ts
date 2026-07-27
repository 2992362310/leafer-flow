import { Connector, isConnector } from "../../../core/connector";
import type { EditorPluginModule } from "../../../api/plugin";

const PLUGIN_ID = "leafer-flow.connector-animation";
const STORAGE_ENABLED_KEY = "enabled";
const STORAGE_SPEED_KEY = "speed";
const STORAGE_SCOPE_KEY = "scope";
const STORAGE_DIRECTION_KEY = "direction";
const DEFAULT_DASH_PATTERN = [10, 8];
const DEFAULT_SPEED = 1;
const probeHandlers = new Map<string, () => void>();

type AnimationScope = "all" | "selected";
type AnimationDirection = "forward" | "reverse";

type ConnectorAnimationState = {
    enabled: boolean;
    rafId: number | null;
    offset: number;
    speed: number;
    scope: AnimationScope;
    direction: AnimationDirection;
};

type AnimatedConnectorSnapshot = {
    connector: Connector;
    originalDashPattern?: number[];
    originalDashOffset?: number;
};

function collectConnectorsFromTree(editor: Parameters<EditorPluginModule["activate"]>[0]["editor"]) {
    const connectors: Connector[] = [];
    for (const child of editor.app.tree.children ?? []) {
        if (isConnector(child)) connectors.push(child);
    }
    return connectors;
}

function collectSelectedConnectors(editor: Parameters<EditorPluginModule["activate"]>[0]["editor"]) {
    return ((editor.app.editor.list as unknown[]) ?? []).filter((item): item is Connector =>
        isConnector(item),
    );
}

function getDashOffset(connector: Connector): number {
    const wire = connector.wire as unknown as { dashOffset?: unknown };
    return typeof wire.dashOffset === "number" ? wire.dashOffset : 0;
}

function setDashOffset(connector: Connector, value: number): void {
    const wire = connector.wire as unknown as { dashOffset?: number };
    wire.dashOffset = value;
}

export const connectorAnimationPlugin: EditorPluginModule = {
    manifest: {
        id: PLUGIN_ID,
        name: "连线动画",
        version: "0.1.0",
        description: "为连接线提供流动动画开关，增强流程演示表达。",
        category: "utility",
        capabilities: ["command", "action-button", "animation"],
        enabledByDefault: true,
        configurable: true,
    },
    contributes: {
        commands: ["切换连线流动动画"],
        buttons: ["连线流动动画"],
    },
    activate(ctx) {
        const state: ConnectorAnimationState = {
            enabled: ctx.storage.get<boolean>(STORAGE_ENABLED_KEY) ?? false,
            rafId: null,
            offset: 0,
            speed: ctx.storage.get<number>(STORAGE_SPEED_KEY) ?? DEFAULT_SPEED,
            scope: (ctx.storage.get<AnimationScope>(STORAGE_SCOPE_KEY) ?? "all") === "selected" ? "selected" : "all",
            direction:
                (ctx.storage.get<AnimationDirection>(STORAGE_DIRECTION_KEY) ?? "forward") === "reverse"
                    ? "reverse"
                    : "forward",
        };

        const animatedConnectors = new Map<string, AnimatedConnectorSnapshot>();

        function getConnectorKey(connector: Connector) {
            return String(connector.innerId);
        }

        function applyAnimationStyle(connectors: Connector[]) {
            for (const connector of connectors) {
                const key = getConnectorKey(connector);
                if (!animatedConnectors.has(key)) {
                    animatedConnectors.set(key, {
                        connector,
                        originalDashPattern: Array.isArray(connector.wire.dashPattern)
                            ? [...connector.wire.dashPattern]
                            : undefined,
                        originalDashOffset: getDashOffset(connector),
                    });
                }

                if (!Array.isArray(connector.wire.dashPattern) || connector.wire.dashPattern.length === 0) {
                    connector.dashPattern = DEFAULT_DASH_PATTERN;
                    connector.wire.dashPattern = DEFAULT_DASH_PATTERN;
                }
            }
        }

        function restoreAnimationStyle() {
            for (const snapshot of animatedConnectors.values()) {
                const { connector, originalDashPattern, originalDashOffset } = snapshot;
                if ((connector as unknown as { destroyed?: boolean }).destroyed) continue;

                connector.dashPattern = originalDashPattern ? [...originalDashPattern] : undefined;
                connector.wire.dashPattern = originalDashPattern ? [...originalDashPattern] : undefined;
                setDashOffset(connector, originalDashOffset ?? 0);
            }
            animatedConnectors.clear();
        }

        function stopAnimationLoop() {
            if (state.rafId != null) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
        }

        function tick() {
            if (!state.enabled) {
                stopAnimationLoop();
                return;
            }

            const connectors =
                state.scope === "selected"
                    ? collectSelectedConnectors(ctx.editor)
                    : collectConnectorsFromTree(ctx.editor);
            applyAnimationStyle(connectors);

            const directionScale = state.direction === "forward" ? -1 : 1;
            state.offset += directionScale * state.speed;
            for (const connector of connectors) {
                setDashOffset(connector, state.offset);
            }

            state.rafId = requestAnimationFrame(tick);
        }

        function startAnimationLoop() {
            stopAnimationLoop();
            state.rafId = requestAnimationFrame(tick);
        }

        function setEnabled(enabled: boolean) {
            if (state.enabled === enabled) return;
            state.enabled = enabled;
            ctx.storage.set(STORAGE_ENABLED_KEY, state.enabled);
            window.dispatchEvent(
                new CustomEvent("leafer-flow:connector-flow-animation-changed", {
                    detail: {
                        enabled: state.enabled,
                        speed: state.speed,
                        scope: state.scope,
                        direction: state.direction,
                    },
                }),
            );

            if (state.enabled) {
                startAnimationLoop();
            } else {
                stopAnimationLoop();
                restoreAnimationStyle();
            }
        }

        function setSpeed(speed: number) {
            const next = Math.min(6, Math.max(0.2, Number.isFinite(speed) ? speed : DEFAULT_SPEED));
            if (state.speed === next) return;
            state.speed = next;
            ctx.storage.set(STORAGE_SPEED_KEY, state.speed);
            window.dispatchEvent(
                new CustomEvent("leafer-flow:connector-flow-animation-changed", {
                    detail: {
                        enabled: state.enabled,
                        speed: state.speed,
                        scope: state.scope,
                        direction: state.direction,
                    },
                }),
            );
        }

        function setScope(scope: AnimationScope) {
            if (state.scope === scope) return;
            state.scope = scope;
            ctx.storage.set(STORAGE_SCOPE_KEY, state.scope);
            notifyState();
        }

        function setDirection(direction: AnimationDirection) {
            if (state.direction === direction) return;
            state.direction = direction;
            ctx.storage.set(STORAGE_DIRECTION_KEY, state.direction);
            notifyState();
        }

        function notifyState() {
            window.dispatchEvent(
                new CustomEvent("leafer-flow:connector-flow-animation-changed", {
                    detail: {
                        enabled: state.enabled,
                        speed: state.speed,
                        scope: state.scope,
                        direction: state.direction,
                    },
                }),
            );
        }

        const onProbe = () => notifyState();
        probeHandlers.set(ctx.pluginId, onProbe);
        window.addEventListener("leafer-flow:connector-flow-animation-probe", onProbe);

        if (state.enabled) {
            startAnimationLoop();
        }
        notifyState();

        ctx.editor.commands.register({
            id: "toggleConnectorFlowAnimation",
            label: "切换连线流动动画",
            pluginId: PLUGIN_ID,
            run: () => {
                setEnabled(!state.enabled);
                return {
                    success: true,
                    message: state.enabled ? "已开启连线流动动画" : "已关闭连线流动动画",
                };
            },
        });

        ctx.editor.commands.register<{ enabled?: boolean }>({
            id: "setConnectorFlowAnimationEnabled",
            label: "设置连线流动动画",
            pluginId: PLUGIN_ID,
            warning: false,
            run: (_editor, payload) => {
                setEnabled(Boolean(payload?.enabled));
                return {
                    success: true,
                    message: state.enabled ? "已开启连线流动动画" : "已关闭连线流动动画",
                };
            },
        });

        ctx.editor.commands.register<{ speed?: number }>({
            id: "setConnectorFlowAnimationSpeed",
            label: "设置连线流动动画速度",
            pluginId: PLUGIN_ID,
            warning: false,
            run: (_editor, payload) => {
                setSpeed(payload?.speed ?? DEFAULT_SPEED);
                return {
                    success: true,
                    message: `连线流动动画速度: ${state.speed.toFixed(1)}`,
                };
            },
        });

        ctx.editor.commands.register<{ scope?: AnimationScope }>({
            id: "setConnectorFlowAnimationScope",
            label: "设置连线流动动画作用范围",
            pluginId: PLUGIN_ID,
            warning: false,
            run: (_editor, payload) => {
                const scope = payload?.scope === "selected" ? "selected" : "all";
                setScope(scope);
                return {
                    success: true,
                    message: scope === "selected" ? "连线动画作用范围：仅选中" : "连线动画作用范围：全局",
                };
            },
        });

        ctx.editor.commands.register<{ direction?: AnimationDirection }>({
            id: "setConnectorFlowAnimationDirection",
            label: "设置连线流动动画方向",
            pluginId: PLUGIN_ID,
            warning: false,
            run: (_editor, payload) => {
                const direction = payload?.direction === "reverse" ? "reverse" : "forward";
                setDirection(direction);
                return {
                    success: true,
                    message: direction === "reverse" ? "连线动画方向：反向" : "连线动画方向：正向",
                };
            },
        });

        ctx.editor.actionButtons.register({
            id: "connector-animation",
            label: "连线动画",
            icon: "draw_arrow",
            pluginId: PLUGIN_ID,
            kind: "button",
            surface: "arrange",
            order: 35,
            items: [
                {
                    id: "toggle-connector-flow-animation",
                    label: "连线流动动画",
                    command: "toggleConnectorFlowAnimation",
                    icon: "draw_arrow",
                    order: 10,
                },
            ],
        });
    },
    deactivate() {
        const onProbe = probeHandlers.get(PLUGIN_ID);
        if (onProbe) {
            window.removeEventListener("leafer-flow:connector-flow-animation-probe", onProbe);
            probeHandlers.delete(PLUGIN_ID);
        }
    },
    configure() {
        return {
            fields: [
                {
                    key: "speed",
                    label: "动画速度",
                    type: "number",
                    default: DEFAULT_SPEED,
                    min: 0.2,
                    max: 6,
                    step: 0.2,
                },
            ],
        };
    },
};
