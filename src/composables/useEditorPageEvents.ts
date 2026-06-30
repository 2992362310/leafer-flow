import type { Ref } from "vue";
import type { DiagramLintUpdatedEventDetail, LintIssue } from "@/editor/builtin/plugins/diagram-lint/types";

interface UseEditorPageEventsOptions {
    agentOpen: Ref<boolean>;
    minimapOpen: Ref<boolean>;
    multiLayerOpen: Ref<boolean>;
    searchOpen: Ref<boolean>;
    historyOpen: Ref<boolean>;
    diagramLintOpen: Ref<boolean>;
    diagramLintIssues: Ref<LintIssue[]>;
    diagramLintGeneratedAt: Ref<number>;
    addCleanup: (cleanup: () => void) => void;
}

type ToggleEventBinding = {
    event: string;
    state: Ref<boolean>;
};

export function useEditorPageEvents(options: UseEditorPageEventsOptions) {
    function bindEvents() {
        const toggleEventBindings: ToggleEventBinding[] = [
            { event: "leafer-flow:toggle-agent", state: options.agentOpen },
            { event: "leafer-flow:toggle-minimap", state: options.minimapOpen },
            { event: "leafer-flow:toggle-layer-panel", state: options.multiLayerOpen },
            { event: "leafer-flow:toggle-search", state: options.searchOpen },
            { event: "leafer-flow:toggle-history", state: options.historyOpen },
        ];

        for (const binding of toggleEventBindings) {
            bindToggleEvent(binding.event, binding.state);
        }

        bindLintUpdatedEvent();
        bindAgentShortcut();
    }

    function bindToggleEvent(eventName: string, state: Ref<boolean>) {
        const handler = () => {
            state.value = !state.value;
        };

        window.addEventListener(eventName, handler);
        options.addCleanup(() => {
            window.removeEventListener(eventName, handler);
        });
    }

    function bindLintUpdatedEvent() {
        const handleLintUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<DiagramLintUpdatedEventDetail>;
            options.diagramLintIssues.value = customEvent.detail?.issues ?? [];
            options.diagramLintGeneratedAt.value = customEvent.detail?.generatedAt ?? Date.now();
            options.diagramLintOpen.value = true;
        };

        window.addEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
        options.addCleanup(() => {
            window.removeEventListener("leafer-flow:diagram-lint-updated", handleLintUpdated);
        });
    }

    function bindAgentShortcut() {
        const handleKeydown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            const { ctrlKey, metaKey, shiftKey, key } = event;
            const isCmd = ctrlKey || metaKey;
            if (isCmd && shiftKey && key.toLowerCase() === "a") {
                event.preventDefault();
                options.agentOpen.value = !options.agentOpen.value;
            }
        };

        window.addEventListener("keydown", handleKeydown);
        options.addCleanup(() => {
            window.removeEventListener("keydown", handleKeydown);
        });
    }

    return {
        bindEvents,
    };
}
