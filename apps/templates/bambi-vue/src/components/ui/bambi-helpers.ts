// Installed by bambiui. Do not edit by hand.

export interface BambiBehavior {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}

export function getAttr(el: Element, name: string, fallback: string): string {
  return el.getAttribute(name) ?? fallback;
}

export function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
}

export function getBoolAttr(el: Element, name: string): boolean {
  return el.getAttribute(name) === "true";
}

export interface RovingFocusOptions {
  orientation?: "horizontal" | "vertical" | "both";
  loop?: boolean;
  getItems: () => Element[];
  isDisabled?: (item: Element) => boolean;
  onFocus: (item: Element) => void;
  onActivate?: (item: Element) => void;
}

export interface RovingFocus {
  destroy(): void;
}

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

      const focused = items.findIndex(
        (item) => item === document.activeElement,
      );
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
        const item = items[focused];
        if (item) options.onActivate(item);
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
