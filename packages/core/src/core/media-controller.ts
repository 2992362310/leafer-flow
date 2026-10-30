import type { App, Video } from "leafer";
import type { DocumentNode, EditorDocument } from "../document/model";
import type { ResourceService } from "../document/resources";

export interface MediaState {
    paused: boolean;
    currentTime: number;
    duration: number;
    error: string;
}

interface Player {
    node: DocumentNode;
    element?: HTMLMediaElement;
    view?: Video;
    state: MediaState;
    cleanup?: () => void;
}

export class MediaController {
    private players = new Map<string, Player>();
    private listeners = new Set<() => void>();
    private pending = false;
    private bindPending = () => {
        if (!this.pending) return;
        this.pending = false;
        for (const [id, player] of this.players) {
            if (player.node.type !== "Video" || player.element) continue;
            const view = this.getView(id) as Video | undefined;
            const element = view?.decoder?.decoder;
            if (!element) {
                this.pending = true;
                continue;
            }
            player.view = view;
            this.bind(player, element);
        }
    };

    constructor(
        private app: App,
        private resources: ResourceService,
        private getView: (id: string) => unknown,
    ) {
        app.on("render.end", this.bindPending);
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getState(id: string): MediaState {
        return {
            ...(this.players.get(id)?.state ?? { paused: true, currentTime: 0, duration: 0, error: "" }),
        };
    }

    beforeRender() {
        for (const player of this.players.values()) {
            if (player.node.type !== "Video") continue;
            this.readState(player);
            player.cleanup?.();
            player.element?.pause();
            player.cleanup = undefined;
            player.element = undefined;
            player.view = undefined;
        }
    }

    sync(document: EditorDocument) {
        const active = new Set<string>();
        const visit = (nodes: DocumentNode[]) => {
            for (const node of nodes) {
                if (node.type === "Audio" || node.type === "Video") {
                    active.add(node.id);
                    let player = this.players.get(node.id);
                    if (
                        player &&
                        (player.node.type !== node.type || player.node.data.assetId !== node.data.assetId)
                    ) {
                        this.release(player);
                        this.players.delete(node.id);
                        player = undefined;
                    }
                    if (!player) {
                        player = {
                            node,
                            state: {
                                paused: true,
                                currentTime: 0,
                                duration: Number(node.data.duration) || 0,
                                error: "",
                            },
                        };
                        this.players.set(node.id, player);
                    }
                    player.node = node;
                    if (node.type === "Audio" && !player.element) {
                        const element = window.document.createElement("audio");
                        element.preload = "metadata";
                        element.src = this.resources.resolve(String(node.data.assetId), document);
                        this.bind(player, element);
                    }
                    if (player.element) this.applySettings(player);
                }
                visit(node.children);
            }
        };
        visit(document.nodes);
        for (const [id, player] of this.players)
            if (!active.has(id)) {
                this.release(player);
                this.players.delete(id);
            }
        this.pending = true;
        this.bindPending();
        this.emit();
    }

    async toggle(id: string) {
        const player = this.players.get(id);
        if (!player?.element) throw new Error("媒体尚未加载完成");
        if (!player.element.paused) {
            player.view?.pause();
            player.element.pause();
        } else {
            try {
                await player.element.play();
                player.view?.play();
                player.state.error = "";
            } catch (error) {
                player.state.error = error instanceof Error ? error.message : "无法播放媒体";
                this.emit();
            }
        }
        this.readState(player);
    }

    seek(id: string, value: number) {
        const player = this.players.get(id);
        if (!player?.element || !Number.isFinite(value)) return;
        const time = Math.max(0, Math.min(value, player.state.duration));
        if (player.view) player.view.currentTime = time;
        else player.element.currentTime = time;
        this.readState(player);
    }

    dispose() {
        this.app.off("render.end", this.bindPending);
        this.reset();
        this.listeners.clear();
    }

    reset() {
        for (const player of this.players.values()) this.release(player);
        this.players.clear();
        this.pending = false;
        this.emit();
    }

    private bind(player: Player, element: HTMLMediaElement) {
        player.element = element;
        this.applySettings(player);
        const restore = () => {
            if (player.state.currentTime > 0) {
                if (player.view) player.view.currentTime = player.state.currentTime;
                else element.currentTime = player.state.currentTime;
            }
            if (!player.state.paused)
                void element
                    .play()
                    .then(() => player.view?.play())
                    .catch((error: unknown) => {
                        player.state.error = error instanceof Error ? error.message : "无法恢复播放";
                        this.readState(player);
                    });
        };
        const update = () => this.readState(player);
        const error = () => {
            player.state.error = element.error?.message || "浏览器无法解码该媒体";
            update();
        };
        for (const event of ["play", "pause", "ended", "timeupdate", "durationchange"])
            element.addEventListener(event, update);
        element.addEventListener("error", error);
        element.addEventListener("loadedmetadata", restore, { once: true });
        player.cleanup = () => {
            for (const event of ["play", "pause", "ended", "timeupdate", "durationchange"])
                element.removeEventListener(event, update);
            element.removeEventListener("error", error);
            element.removeEventListener("loadedmetadata", restore);
        };
        if (element.readyState >= 1) restore();
        this.emit();
    }

    private applySettings(player: Player) {
        const element = player.element!;
        element.volume = Math.max(0, Math.min(1, Number(player.node.data.volume ?? 1)));
        element.muted = Boolean(player.node.data.muted ?? player.node.type === "Video");
        element.loop = Boolean(player.node.data.loop);
    }

    private readState(player: Player) {
        const element = player.element;
        if (!element) return;
        player.state.paused = element.paused;
        player.state.currentTime = Number.isFinite(element.currentTime) ? element.currentTime : 0;
        player.state.duration = Number.isFinite(element.duration)
            ? element.duration
            : player.state.duration;
        this.emit();
    }

    private release(player: Player) {
        player.cleanup?.();
        player.view?.pause();
        player.element?.pause();
        if (player.node.type === "Audio" && player.element) {
            player.element.removeAttribute("src");
            player.element.load();
        }
    }

    private emit() {
        for (const listener of this.listeners) listener();
    }
}
