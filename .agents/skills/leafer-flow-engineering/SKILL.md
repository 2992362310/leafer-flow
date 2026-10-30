---
name: leafer-flow-engineering
description: "Repository engineering skill for Leafer Flow. Use when refactoring the editor architecture, adding or changing tools, actions, serialization, history or autosave behavior, property panels, context menus, layer tree, or other Vue + TypeScript code in this specific repository. Covers repo-specific boundaries, validation order, high-risk modules, and preferred implementation patterns."
---

# Leafer Flow Engineering Skill

This skill captures repository-specific engineering guidance for the Leafer Flow workspace.

Use this skill when working on:

- tool registration or shape library changes
- action layer changes under `src/editor/action`
- editor core changes under `src/editor/core` or `src/editor/editor.ts`
- serialization, autosave, history, clipboard, group, or connector behavior
- Vue components that directly interact with the editor, such as `App.vue`, `EditorPanel.vue`, `ContextMenu.vue`, or layer tree components
- refactors intended to reduce coupling in this repository

Do not use this skill for generic LeaferJS code generation. For Leafer framework knowledge, use the existing `leafer-ai` skill.

## Repository Facts

Use the live `list_tools` / `get_tool_details` tools or read `packages/builtin-plugins/src/builtin/plugins/agent/agent-tools.ts` for schemas and capabilities. Shape enums derive from `SHAPE_TOOLS`; never duplicate their count or names in documentation.

Use `list_skills` / `get_skill` for workflow guidance from `agent-skills.ts`. Keep this engineering skill focused on ownership, safety rules and validation rather than another static tool inventory.

- `src/editor/index.ts`
- `src/editor/shape-library.ts`

Preferred direction:

- define tool metadata once
- derive registration and UI library display data from that definition
- keep `src/editor/index.ts` as an initialization surface, not the canonical tool catalog

### 2. Separate command dispatch from Vue components

When changing user-triggered behavior:

- do not keep expanding direct imports of many `do-*.ts` functions inside Vue components
- prefer a dispatcher or command map boundary
- keep UI components focused on rendering, interaction collection, and feedback

If a change requires touching both component logic and action logic, ask whether the component is making a domain decision that belongs in `src/editor/action` or `src/editor/core`.

### 3. Keep side effects explicit and centralized

Repository-specific concern:

- many mutations currently require some combination of `history.save()`, `autoSave.save()`, connector-label syncing, or selection refresh

When editing mutation flows:

- identify all required side effects before changing logic
- do not update only the visual tree and forget persistence or connector synchronization
- if refactoring, move toward one explicit mutation-commit path rather than duplicating save logic again

Do not assume a mutation is complete just because the canvas updates.

### 4. Treat serialization as a contract

When touching document projection, clipboard logic, connector state, or custom data fields:

- keep document projection, file import/export, and autosave behavior aligned
- verify round-trip behavior for connector bindings and label runtime props

Treat the current document schema as the source of truth; do not add legacy-format compatibility paths.

### 5. Be careful with async action boundaries

`doLoad()` is file-input driven and effectively async.

When refactoring:

- do not hide async behavior behind unsafe sync casts
- keep call sites honest about asynchronous completion
- normalize action result handling when mixing sync and async commands

### 6. Reuse selection predicates

Selection-derived rules like these should not be reimplemented in multiple components:

- can group
- can ungroup
- contains connector
- contains group
- selected connector label target

If a UI affordance and an action both need the same selection rule, extract a shared predicate.

### 7. Prefer narrow refactors with immediate validation

Because this repository has no automated tests yet:

- choose the smallest edit slice that changes one behavior at a time
- validate the touched slice immediately after the first substantive edit
- do not combine tool registration refactors, serialization changes, and UI rewrites in one step unless required

## Working Patterns

### Pattern: adding a new tool or shape

1. Find the current source of truth for the tool name and UI label.
2. Check whether the tool is defined in both registration and shape library metadata.
3. Prefer consolidating metadata instead of adding another duplicated entry.
4. Verify creation works from both toolbar/library paths if both exist.

### Pattern: editing a mutating action

1. Read the owning `do-*.ts` file and one nearby call site.
2. Identify required side effects: history, autosave, connector sync, selection update.
3. Make the smallest possible edit.
4. Validate with the cheapest behavior-scoped check available.

### Pattern: refactoring a Vue panel

1. Separate derived editor state from presentation state.
2. Move selection parsing and domain rules out of the component when they start growing.
3. Keep the component thin if it is mostly reflecting editor state.

### Pattern: serialization or connector changes

1. Inspect both save and load paths.
2. Inspect clipboard duplication logic if connector structures are involved.
3. Check label persistence and runtime restoration together.
4. Validate at least one round-trip path after changes.

### Pattern: adding or modifying an Agent tool

When modifying `packages/builtin-plugins/src/builtin/plugins/agent/agent-tools.ts`:

1. Add the tool to the `getAgentTools()` array with:
   - `name`: tool identifier (snake_case)
   - `description`: one-sentence LLM instruction in English or Chinese
   - `parameters`: JSON schema describing inputs
   - `execute`: implementation calling editor commands or applying changes

2. Update related workflow recipes in `agent-skills.ts`; update `SYSTEM_PROMPT` when the service needs a new behavioral rule.

3. If the tool creates or modifies shapes, verify:
   - use document commands and stable document IDs; do not mutate renderer children directly
   - service transactions close in finally and never span a model request or user question
   - selection predicates pass through `get_selection_info`; failures throw and become structured results

4. Validate the touched slice using `node --test --test-name-pattern="agent " scripts/runtime.test.mjs` when protocol, history or async behavior changes. For Vue changes, use the narrowest diagnostics or `pnpm --filter @leafer-flow/builtin-plugins typecheck`.

**Common mistakes:**

- forgetting to add the tool to `SYSTEM_PROMPT` → LLM doesn't know to use it
- tool enum incomplete (shape_type enum mismatch with TOOL_NAME constants) → runtime error
- missing `editor.commitMutation()` → changes visible but not persisted/undoable
- silently accepting translated or unknown parameter names instead of guiding schema-correct retries
- treating a plain text reply as proof of Function Calling support
- allowing a cancelled question or late answer to resume editing

## Validation Order

Prefer this order after code changes:

1. reasoning from the local code path plus editor diagnostics
2. the narrowest behavior check for the touched slice, only when the change is risky or ambiguous
3. a targeted build or type check only when needed to disambiguate correctness
4. `pnpm run build` only when the user asks for it or when the change is broad enough that cheaper checks are not credible

For this repository, do not proactively add or run tests, builds, or other high-cost verification steps just by habit.

Escalate validation only when one of these is true:

- the user explicitly asks for testing, build verification, or stronger confidence
- the edit touches serialization, connector restoration, clipboard remapping, history, or autosave behavior
- the local reasoning path leaves material uncertainty that diagnostics alone cannot resolve

When inexpensive validation is enough, prefer:

- workspace diagnostics
- type or lint feedback on the touched file
- manual reasoning based on the owning code path

For manual verification, use these flows first:

- create shape from library drag-and-drop
- group and ungroup selected nodes
- copy and paste nodes with connectors and labels
- save, reload, and autosave restore
- connector selection and label sync after move/resize

## Refactor Priorities

When the user asks for maintainability work, prefer this order:

1. unify tool metadata
2. remove registration duplication in `src/editor/index.ts`
3. introduce an action dispatch boundary for Vue components
4. create minimum test seams around action/core modules only if later needed
5. centralize mutation side effects
6. split `EditorPanel.vue` state handling into reusable composables

## Anti-patterns For This Repository

Avoid these repository-specific mistakes:

- adding another duplicated tool definition instead of consolidating metadata
- making Vue components import even more low-level action functions
- updating connector visuals without checking persistence and restore paths
- changing `doLoad()` behavior while preserving a fake sync signature
- treating docs as authoritative when nearby code contradicts them
- adding test scaffolding or running broad verification for small local edits without user value
- broad refactors without a focused validation step between edits
- **Agent-specific**: duplicating tool definitions in a separate enum/toolMap instead of deriving the catalog and schemas
- **Agent-specific**: omitting `SYSTEM_PROMPT` update → LLM unaware of new capability
- **Agent-specific**: tool parameter schema mismatched with TypeScript `args` type → LLM call parsing fails
- **Agent-specific**: calling `editor.commands.execute()` without error handling → silent tool failure masks LLM confusion

## Response Strategy

When using this skill:

1. identify the owning layer first: UI, action, core, tool, or serialization
2. state one local hypothesis about where the behavior is controlled
3. prefer the smallest edit that improves the boundary or behavior
4. validate before widening scope
5. mention repository-specific risks if touching connectors, serialization, clipboard, or history

## Output Expectations

When giving advice or making changes in this repository:

- be concrete about file ownership
- reference the affected layer and side effects
- prefer implementation guidance that reduces duplication and coupling
- default to codebase-specific recommendations over generic frontend advice

---

## Appendix: AI Agent Tools Reference

Complete list of 45 tools available to the LLM via chat interface.

### File Operations (4 tools)

| Tool         | Description          |
| ------------ | -------------------- |
| `save_file`  | Save current diagram |
| `load_file`  | Load diagram file    |
| `export_png` | Export as PNG image  |
| `export_svg` | Export as SVG vector |

### Edit Operations (7 tools)

| Tool         | Description                                      |
| ------------ | ------------------------------------------------ |
| `undo`       | Undo last operation                              |
| `redo`       | Redo last undo                                   |
| `delete`     | Delete selected elements                         |
| `copy`       | Copy selected elements                           |
| `cut`        | Cut selected elements                            |
| `paste`      | Paste copied elements                            |
| `duplicate`  | Duplicate selected elements in place with offset |
| `select_all` | Select all canvas elements                       |

### Layout Operations (8 tools)

| Tool             | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `align`          | Align selected elements (left, center, right, top, middle, bottom) |
| `distribute`     | Distribute selected elements (horizontal, vertical)                |
| `group`          | Group selected elements                                            |
| `ungroup`        | Ungroup selected groups                                            |
| `bring_forward`  | Move selected element forward in z-order                           |
| `send_backward`  | Move selected element backward in z-order                          |
| `bring_to_front` | Move selected element to front                                     |
| `send_to_back`   | Move selected element to back                                      |

### Shape Creation (2 tools)

| Tool                  | Parameters                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_shape`        | **shape_type** (56 enum values): rect, circle, diamond, triangle, pentagon, hexagon, parallelogram, star, note, cylinder, text, flow*\* (9 types), bpmn*\_ (9 types), arch\_\_ (10 types), arrow, freehand<br>**x, y** (optional): position<br>**width, height** (optional): size<br>**text** (optional): initial text                                                     |
| `batch_create_shapes` | **shape_type** (required, same as create_shape): shape type<br>**count** (required): 1-20 shapes<br>**texts** (optional array): text for each shape<br>**start_x, start_y** (optional, default 100): starting position<br>**width, height** (optional): shape size<br>**spacing_x, spacing_y** (optional): grid spacing<br>**columns** (optional, default 5): grid columns |

### Template Insertion (1 tool)

| Tool              | Parameters                                                                                                                                                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insert_template` | **template_type** (enum): approval, decision, workOrder, crm, login, payment, bpmnOrder, systemArchitecture, swimlaneCollaboration<br>**offset_x** (optional, default 100): horizontal position offset<br>**offset_y** (optional, default 80): vertical position offset<br>**scale** (optional, default 1): scale factor (range 0.5-2) |

### Styling (2 tools)

| Tool          | Description                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `set_style`   | Modify selected elements: fill, stroke, stroke_width, opacity, x, y, width, height, rotation, corner_radius |
| `modify_text` | Modify text content/style: text, font_size, text_color                                                      |

### View Control (4 tools)

| Tool         | Description              |
| ------------ | ------------------------ |
| `zoom_fit`   | Fit canvas content       |
| `zoom_in`    | Zoom in (20% increment)  |
| `zoom_out`   | Zoom out (20% decrement) |
| `zoom_reset` | Reset zoom to 100%       |

### Canvas Inspection (3 tools)

| Tool                 | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `clear_canvas`       | Clear all elements from canvas                                      |
| `get_canvas_info`    | Get element count, zoom level, selection info                       |
| `get_selection_info` | Get detailed info of selected elements (properties, text, children) |
| `search_elements`    | Search canvas elements by name or text content                      |

### Connector Operations (1 tool)

| Tool               | Description                                |
| ------------------ | ------------------------------------------ |
| `connect_elements` | Connect two elements with a connector line |

**Implementation location:** `src/editor/builtin/plugins/agent/agent-tools.ts`

**Configuration location:** `src/editor/builtin/plugins/agent/agent-config.ts` (API endpoint, model, temperature, history limits)
