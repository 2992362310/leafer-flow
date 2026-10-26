import type { Component } from "vue";
import type { Editor } from "@leafer-flow/core";
import type { OverlayPanelContribution } from "@leafer-flow/core/api/overlay-panel";
import type { LintIssue } from "@leafer-flow/builtin-plugins/builtin/plugins/diagram-lint/types";
import type { PanelVisibility, OverlayPanelId } from "@leafer-flow/ui/context";

export interface OverlayPanelContext {
  editor: Editor | undefined;
  visibility: PanelVisibility;
  diagramLintIssues: LintIssue[];
  diagramLintGeneratedAt: number;
  onPluginMarketChanged: () => void;
}

export interface OverlayPanelDef {
  id: OverlayPanelId;
  component: Component;
  shouldMount: (ctx: OverlayPanelContext) => boolean;
  getBindings: (ctx: OverlayPanelContext) => Record<string, unknown>;
  getListeners?: (ctx: OverlayPanelContext) => Record<string, (...args: unknown[]) => void>;
}

function toOverlayPanelDef(contribution: OverlayPanelContribution): OverlayPanelDef {
  const { id, component, visibilityMode, needsEditor = true, props: staticProps } = contribution;

  if (visibilityMode === "self-visible") {
    return {
      id,
      component,
      shouldMount: (ctx) => Boolean(ctx.editor) && ctx.visibility.isMounted(id),
      getBindings: (ctx) => ({ editor: ctx.editor, ...(staticProps ?? {}) }),
    };
  }

  return {
    id,
    component,
    shouldMount: (ctx) => {
      if (needsEditor && !ctx.editor) return false;
      return ctx.visibility.isMounted(id);
    },
    getBindings: (ctx) => {
      const bindings: Record<string, unknown> = {
        open: ctx.visibility.shouldShowFloat(id),
        ...(staticProps ?? {}),
      };
      if (needsEditor) bindings.editor = ctx.editor;
      return bindings;
    },
    getListeners: (ctx) => ({
      close: () => ctx.visibility.closeFloat(id),
    }),
  };
}

function applyPanelExtensions(def: OverlayPanelDef): OverlayPanelDef {
  if (def.id === "plugin-market") {
    return {
      ...def,
      getListeners: (ctx) => ({
        close: () => ctx.visibility.closeFloat("plugin-market"),
        changed: ctx.onPluginMarketChanged,
      }),
    };
  }

  if (def.id === "diagram-lint") {
    return {
      ...def,
      getBindings: (ctx) => ({
        open: ctx.visibility.shouldShowFloat("diagram-lint"),
        editor: ctx.editor,
        issues: ctx.diagramLintIssues,
        generatedAt: ctx.diagramLintGeneratedAt,
      }),
    };
  }

  return def;
}

export function resolveOverlayPanelDefs(editor: Editor | undefined): OverlayPanelDef[] {
  if (!editor) return [];

  return editor.overlayPanels
    .list()
    .map((contribution) => applyPanelExtensions(toOverlayPanelDef(contribution)));
}
