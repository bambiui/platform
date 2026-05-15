# Core Primitive Implementation Plan

These primitives are prerequisites for Dialog, Drawer, Popover, Select, Combobox, and Menu. Keep them framework-free and usable by copied controllers.

## Roving Focus

**Status: implemented** — `packages/core/src/primitives/roving-focus.ts`

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

Purpose: trap and restore focus while modal content is active.

Draft API: `createFocusScope(container, { trapped, restoreFocus, initialFocus?, fallbackFocus? })`.

Needed by: Dialog, Drawer, Popover modal mode, Select popover.

Checklist: capture previously focused element; find tabbables; cycle Tab and Shift+Tab; focus initial target; restore on destroy; handle empty scopes with fallback.

## Dismissable Layer

Purpose: close floating UI on outside pointer, Escape, and focus leaving the layer.

Draft API: `createDismissableLayer(node, { onDismiss, disableOutsidePointerEvents?, exclude? })`.

Needed by: Dialog, Drawer, Popover, Select, Menu.

Checklist: register with layer manager; only top layer dismisses; handle pointerdown outside; handle Escape; support nested layers and excluded anchors; clean up listeners.

## Layer Manager

Purpose: maintain stack order for modal and non-modal layers.

Draft API: `createLayerManager()` with `register(layer)`, `unregister(id)`, `isTopLayer(id)`, and `layers()`.

Needed by: DismissableLayer, Dialog, Drawer, Popover, Tooltip.

Checklist: stable layer ids; modal flag; top-layer queries; inert/outside pointer coordination; deterministic cleanup order.

## Scroll Lock

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
