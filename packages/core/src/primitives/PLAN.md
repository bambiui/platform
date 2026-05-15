# Core Primitive Implementation Plan

These primitives are prerequisites for Dialog, Drawer, Popover, Select, Combobox, and Menu. Keep them framework-free and usable by copied controllers.

## Roving Focus

**Status: implemented, tested** — `packages/core/src/primitives/roving-focus.ts`

Purpose: one tab stop inside a composite widget, with arrow-key movement among enabled items.

Real API:

```ts
createRovingFocus(container: Element, options: RovingFocusOptions): RovingFocus

interface RovingFocusOptions {
  orientation?: "horizontal" | "vertical" | "both"; // default: "horizontal"
  loop?: boolean;                                    // default: true
  getItems: () => Element[];                         // called fresh on each keydown
  isDisabled?: (item: Element) => boolean;           // return true to skip item
  onFocus: (item: Element) => void;                  // move focus to this item
  onActivate?: (item: Element) => void;              // Enter / Space — omit to disable
}

interface RovingFocus {
  destroy(): void; // removes keydown listener via AbortController
}
```

Supported behaviors: horizontal navigation (ArrowLeft/Right), vertical navigation (ArrowUp/Down), `both` axes, loop wrapping, disabled-item skip via `isDisabled`, Home/End, Enter/Space activation, cleanup via `destroy()`.

**Tabs note**: Tabs still does its own inline keyboard navigation. Migration to `createRovingFocus` is safe when activation-mode (automatic vs manual), ARIA sync path, and disabled-item handling are verified to be preserved end-to-end.

Ideal first consumers: RadioGroup, Toolbar, Menu (auto-activation), Select listbox.

## Focus Scope

**Status: planned** — `packages/core/src/primitives/focus-scope.ts` is a non-exported placeholder and must not be used by components yet.

Purpose: trap and restore focus while modal content is active.

Draft API: `createFocusScope(container, { trapped, restoreFocus, initialFocus?, fallbackFocus? })`.

Needed by: Dialog, Drawer, Popover modal mode, Select popover.

Checklist: capture previously focused element; find tabbables; cycle Tab and Shift+Tab; focus initial target; restore on destroy; handle empty scopes with fallback.

## Dismissable Layer

**Status: planned** — `packages/core/src/primitives/dismissable-layer.ts` is a non-exported placeholder and must not be used by components yet.

Purpose: close floating UI on outside pointer, Escape, and focus leaving the layer.

Draft API: `createDismissableLayer(node, { onDismiss, disableOutsidePointerEvents?, exclude? })`.

Needed by: Dialog, Drawer, Popover, Select, Menu.

Checklist: register with layer manager; only top layer dismisses; handle pointerdown outside; handle Escape; support nested layers and excluded anchors; clean up listeners.

## Layer Manager

**Status: planned** — `packages/core/src/primitives/layer-manager.ts` is a non-exported placeholder and must not be used by components yet.

Purpose: maintain stack order for modal and non-modal layers.

Draft API: `createLayerManager()` with `register(layer)`, `unregister(id)`, `isTopLayer(id)`, and `layers()`.

Needed by: DismissableLayer, Dialog, Drawer, Popover, Tooltip.

Checklist: stable layer ids; modal flag; top-layer queries; inert/outside pointer coordination; deterministic cleanup order.

## Scroll Lock

**Status: planned** — `packages/core/src/primitives/scroll-lock.ts` is a non-exported placeholder and must not be used by components yet.

Purpose: prevent background scroll while modal layers are open.

Draft API: `lockScroll({ document?, reserveScrollbarGap? })` returning `{ unlock() }`.

Needed by: Dialog, Drawer, full-screen Select on mobile.

Checklist: reference-count locks; preserve existing body styles; compensate scrollbar gap; support nested locks; unlock idempotently.

## Build Order

1. Roving Focus for Tabs-adjacent composites.
2. Layer Manager.
3. Dismissable Layer on top of Layer Manager.
4. Focus Scope.
5. Scroll Lock.

Dialog and Drawer should wait for Layer Manager, Dismissable Layer, Focus Scope, and Scroll Lock. Popover and Select should wait for Layer Manager and Dismissable Layer; Select also needs Roving Focus.

## Readiness Matrix

| Primitive | Status | Tested | Required before |
| --- | --- | --- | --- |
| Roving Focus | implemented | yes | RadioGroup, Select |
| Layer Manager | planned | no | Dialog, Drawer, Popover, Select |
| Dismissable Layer | planned | no | Dialog, Drawer, Popover, Select |
| Focus Scope | planned | no | Dialog, Drawer |
| Scroll Lock | planned | no | Dialog, Drawer |

Only implemented primitives are exported from `src/primitives/index.ts`. Placeholder files may remain in the tree as roadmap anchors, but components must not list them in `primitiveFiles` until their implementation and tests land.

`primitiveFiles` is intentionally explicit: if a primitive imports another primitive or local helper, every transitive file must be listed in the component manifest. The CLI does not resolve primitive dependency graphs.
