import {
  TABS_TRIGGER,
  TABS_CONTENT,
  TABS_LIST,
  TABS_VALUE,
  TABS_DEFAULT_VALUE,
  TABS_CONTROLLED,
  TABS_ORIENTATION,
  TABS_DISABLED,
  TABS_STATE,
  TABS_EVENT_VALUE_CHANGE,
  type TabsValueChangeDetail,
} from "./tabs.contract.js";

export type { TabsValueChangeDetail } from "./tabs.contract.js";

// ── Inlined types ─────────────────────────────────────────────────────────

export interface BambiController {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}

export type TabsOrientation = "horizontal" | "vertical";

export interface TabsOptions {
  value?: string;
  defaultValue?: string;
  controlled?: boolean;
  orientation?: TabsOrientation;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

// ── Inlined DOM helpers ───────────────────────────────────────────────────

function getAttr(el: Element, name: string, fallback: string): string {
  return el.getAttribute(name) ?? fallback;
}

function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
}

function getBoolAttr(el: Element, name: string): boolean {
  return el.getAttribute(name) === "true";
}

function dispatchTabsEvent(element: Element, detail: TabsValueChangeDetail): void {
  element.dispatchEvent(
    new CustomEvent<TabsValueChangeDetail>(TABS_EVENT_VALUE_CHANGE, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    }),
  );
}

// ── Controller ────────────────────────────────────────────────────────────

export class TabsController implements BambiController {
  private static _idCounter = 0;

  private readonly root: Element;
  private options: TabsOptions;
  private currentValue: string | null = null;
  private readonly _id: string;
  private readonly destroyAbort: AbortController;
  private bindAbort: AbortController;

  constructor(root: Element, options: TabsOptions = {}) {
    this.root = root;
    this.options = options;
    this._id = root.id || `bambi-tabs-${++TabsController._idCounter}`;
    this.destroyAbort = new AbortController();
    this.bindAbort = new AbortController();
  }

  sync(): void {
    // Abort previous event listeners to avoid duplicates on repeated sync() calls
    this.bindAbort.abort();
    this.bindAbort = new AbortController();

    const orientation = (
      this.options.orientation ??
      getAttr(this.root, TABS_ORIENTATION, "horizontal")
    ) as TabsOrientation;

    setAttr(this.root, TABS_ORIENTATION, orientation);

    // Set aria-orientation on all tablist elements
    for (const list of Array.from(this.root.querySelectorAll(`[${TABS_LIST}]`))) {
      list.setAttribute("aria-orientation", orientation);
    }

    const value =
      (this.options.value ?? getAttr(this.root, TABS_VALUE, "")) ||
      (this.options.defaultValue ?? getAttr(this.root, TABS_DEFAULT_VALUE, "")) ||
      this.firstTriggerValue();

    // Apply initial state without dispatching any events (mount is not a user interaction)
    if (value) this.applyState(value, orientation);

    this.bindEvents();
  }

  update(options: TabsOptions = {}): void {
    const prev = this.options;
    this.options = { ...this.options, ...options };

    if (options.value !== undefined && options.value !== prev.value && options.value) {
      const orientation = (
        this.options.orientation ??
        getAttr(this.root, TABS_ORIENTATION, "horizontal")
      ) as TabsOrientation;
      // Prop update — apply state silently, no event dispatch
      this.applyState(options.value, orientation);
    }
  }

  destroy(): void {
    this.destroyAbort.abort();
    this.bindAbort.abort();
  }

  private firstTriggerValue(): string | null {
    return this.root.querySelector(`[${TABS_TRIGGER}]`)?.getAttribute(TABS_VALUE) ?? null;
  }

  private triggers(): Element[] {
    return Array.from(this.root.querySelectorAll(`[${TABS_TRIGGER}]`));
  }

  private contents(): Element[] {
    return Array.from(this.root.querySelectorAll(`[${TABS_CONTENT}]`));
  }

  /** Apply visual state for a value. Never dispatches events — only for sync/update. */
  private applyState(newValue: string, orientation: TabsOrientation): void {
    const isControlled =
      this.options.controlled ?? getBoolAttr(this.root, TABS_CONTROLLED);

    if (!isControlled) setAttr(this.root, TABS_VALUE, newValue);
    this.currentValue = newValue;

    for (const trigger of this.triggers()) {
      const val = trigger.getAttribute(TABS_VALUE) ?? "";
      if (!trigger.id) trigger.id = `${this._id}-trigger-${val}`;
      trigger.setAttribute("aria-controls", `${this._id}-content-${val}`);

      const isActive = val === newValue;
      setAttr(trigger, TABS_STATE, isActive ? "active" : "inactive");
      trigger.setAttribute("aria-selected", String(isActive));
      trigger.setAttribute("tabindex", isActive ? "0" : "-1");
    }

    for (const content of this.contents()) {
      const val = content.getAttribute(TABS_VALUE) ?? "";
      if (!content.id) content.id = `${this._id}-content-${val}`;
      content.setAttribute("aria-labelledby", `${this._id}-trigger-${val}`);
      content.setAttribute("aria-orientation", orientation);

      const isActive = val === newValue;
      setAttr(content, TABS_STATE, isActive ? "active" : "inactive");
      if (isActive) {
        content.removeAttribute("hidden");
      } else {
        content.setAttribute("hidden", "");
      }
    }
  }

  /** Apply a user-initiated value change. Dispatches events and calls onValueChange. */
  private applyValue(newValue: string, source: "click" | "keyboard"): void {
    if (newValue === this.currentValue) return;

    const isControlled =
      this.options.controlled ?? getBoolAttr(this.root, TABS_CONTROLLED);
    const previousValue = this.currentValue;

    const orientation = (
      this.options.orientation ??
      getAttr(this.root, TABS_ORIENTATION, "horizontal")
    ) as TabsOrientation;

    if (!isControlled) this.applyState(newValue, orientation);
    else this.currentValue = newValue;

    dispatchTabsEvent(this.root, { value: newValue, previousValue, source });
    this.options.onValueChange?.(newValue);
  }

  private bindEvents(): void {
    const { signal } = this.bindAbort;

    this.root.addEventListener(
      "click",
      (event: Event) => {
        const disabled = this.options.disabled ?? getBoolAttr(this.root, TABS_DISABLED);
        if (disabled) return;

        const target = (event.target as Element).closest(`[${TABS_TRIGGER}]`);
        if (!target || !this.root.contains(target)) return;

        const isDisabledTrigger =
          getBoolAttr(target, TABS_DISABLED) ||
          target.getAttribute("aria-disabled") === "true";
        if (isDisabledTrigger) return;

        const value = target.getAttribute(TABS_VALUE);
        if (!value) return;

        const isControlled = this.options.controlled ?? getBoolAttr(this.root, TABS_CONTROLLED);
        if (!isControlled) {
          this.applyValue(value, "click");
        } else {
          dispatchTabsEvent(this.root, {
            value,
            previousValue: this.currentValue,
            source: "click",
          });
          this.options.onValueChange?.(value);
        }
      },
      { signal },
    );

    this.root.addEventListener(
      "keydown",
      (event: Event) => {
        const disabled = this.options.disabled ?? getBoolAttr(this.root, TABS_DISABLED);
        if (disabled) return;

        const e = event as KeyboardEvent;
        const orientation = (
          this.options.orientation ??
          getAttr(this.root, TABS_ORIENTATION, "horizontal")
        ) as TabsOrientation;

        const activeTriggers = this.triggers().filter(
          (t) => !getBoolAttr(t, TABS_DISABLED) && t.getAttribute("aria-disabled") !== "true",
        );
        const focused = activeTriggers.findIndex((t) => t === document.activeElement);
        if (focused === -1) return;

        const isHorizontal = orientation === "horizontal";
        const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
        const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

        if (e.key === nextKey) {
          e.preventDefault();
          (activeTriggers[(focused + 1) % activeTriggers.length] as HTMLElement).focus();
        } else if (e.key === prevKey) {
          e.preventDefault();
          (activeTriggers[(focused - 1 + activeTriggers.length) % activeTriggers.length] as HTMLElement).focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          (activeTriggers[0] as HTMLElement).focus();
        } else if (e.key === "End") {
          e.preventDefault();
          (activeTriggers[activeTriggers.length - 1] as HTMLElement).focus();
        }
      },
      { signal },
    );
  }
}
