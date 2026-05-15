export interface RovingFocusOptions {
  /** Arrow-key axes to handle. Default: "horizontal". */
  orientation?: "horizontal" | "vertical" | "both";
  /** Wrap focus from last → first and first → last. Default: true. */
  loop?: boolean;
  /** Returns the current set of candidate items on each keydown. */
  getItems: () => Element[];
  /** Return true to skip an item during navigation. */
  isDisabled?: (item: Element) => boolean;
  /** Called with the item that should receive focus. */
  onFocus: (item: Element) => void;
  /**
   * Called when the currently focused item should be activated (Enter / Space).
   * If omitted, Enter and Space are not handled.
   */
  onActivate?: (item: Element) => void;
}

export interface RovingFocus {
  destroy(): void;
}

/**
 * Attaches a roving-focus keydown handler to `container`.
 *
 * Handles ArrowLeft/Right/Up/Down (per orientation), Home, End, and optionally
 * Enter/Space. Disabled items are skipped. Focus wrapping is configurable.
 *
 * This primitive is framework-free and copies cleanly into user projects.
 * It does NOT manage tabindex or ARIA — the caller (controller) owns those.
 */
export function createRovingFocus(
  container: Element,
  options: RovingFocusOptions,
): RovingFocus {
  const abort = new AbortController();
  const { signal } = abort;
  const loop = options.loop ?? true;
  const orientation = options.orientation ?? "horizontal";

  const isHorizontal = orientation === "horizontal" || orientation === "both";
  const isVertical = orientation === "vertical" || orientation === "both";

  container.addEventListener(
    "keydown",
    (event: Event) => {
      const e = event as KeyboardEvent;
      const items = options
        .getItems()
        .filter((item) => !(options.isDisabled?.(item) ?? false));

      if (items.length === 0) return;

      const focused = items.findIndex((item) => item === document.activeElement);
      if (focused === -1) return;

      let next: Element | undefined;

      if (
        (isHorizontal && e.key === "ArrowRight") ||
        (isVertical && e.key === "ArrowDown")
      ) {
        e.preventDefault();
        const nextIndex = loop
          ? (focused + 1) % items.length
          : Math.min(focused + 1, items.length - 1);
        next = items[nextIndex];
      } else if (
        (isHorizontal && e.key === "ArrowLeft") ||
        (isVertical && e.key === "ArrowUp")
      ) {
        e.preventDefault();
        const prevIndex = loop
          ? (focused - 1 + items.length) % items.length
          : Math.max(focused - 1, 0);
        next = items[prevIndex];
      } else if (e.key === "Home") {
        e.preventDefault();
        next = items[0];
      } else if (e.key === "End") {
        e.preventDefault();
        next = items[items.length - 1];
      } else if ((e.key === "Enter" || e.key === " ") && options.onActivate) {
        e.preventDefault();
        options.onActivate(items[focused]);
        return;
      }

      if (next) options.onFocus(next);
    },
    { signal },
  );

  return {
    destroy() {
      abort.abort();
    },
  };
}
