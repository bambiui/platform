import type { BambiController } from "../../dom/controller.js";
import { dispatchBambiEvent } from "../../dom/events.js";
import { getAttr, setAttr, getBoolAttr } from "../../dom/attributes.js";
import {
  TABS_TRIGGER,
  TABS_CONTENT,
  TABS_VALUE,
  TABS_DEFAULT_VALUE,
  TABS_CONTROLLED,
  TABS_ORIENTATION,
  TABS_DISABLED,
  TABS_STATE,
  TABS_EVENT_VALUE_CHANGE,
  type TabsValueChangeDetail,
} from "./tabs.contract.js";
import type { TabsOptions, TabsOrientation } from "./tabs.types.js";

export class TabsController implements BambiController {
  private readonly root: Element;
  private options: TabsOptions;
  private currentValue: string | null = null;
  private readonly abort: AbortController;

  constructor(root: Element, options: TabsOptions = {}) {
    this.root = root;
    this.options = options;
    this.abort = new AbortController();
  }

  sync(): void {
    const isControlled =
      this.options.controlled ?? getBoolAttr(this.root, TABS_CONTROLLED);

    const value =
      (this.options.value ?? getAttr(this.root, TABS_VALUE, "")) ||
      (this.options.defaultValue ?? getAttr(this.root, TABS_DEFAULT_VALUE, "")) ||
      this.firstTriggerValue();

    const orientation = (
      this.options.orientation ??
      getAttr(this.root, TABS_ORIENTATION, "horizontal")
    ) as TabsOrientation;

    setAttr(this.root, TABS_ORIENTATION, orientation);

    const disabled =
      this.options.disabled ?? getBoolAttr(this.root, TABS_DISABLED);

    if (value) this.applyValue(value, "sync");
    this.bindEvents(isControlled, disabled, orientation);
  }

  update(options: TabsOptions = {}): void {
    const prev = this.options;
    this.options = { ...this.options, ...options };

    if (options.value !== undefined && options.value !== prev.value && options.value) {
      this.applyValue(options.value, "sync");
    }
  }

  destroy(): void {
    this.abort.abort();
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

  private applyValue(newValue: string, source: "click" | "keyboard" | "sync"): void {
    const previousValue = this.currentValue;
    if (newValue === previousValue && source !== "sync") return;

    const isControlled =
      this.options.controlled ?? getBoolAttr(this.root, TABS_CONTROLLED);

    if (!isControlled) setAttr(this.root, TABS_VALUE, newValue);
    this.currentValue = newValue;

    for (const trigger of this.triggers()) {
      const isActive = trigger.getAttribute(TABS_VALUE) === newValue;
      setAttr(trigger, TABS_STATE, isActive ? "active" : "inactive");
      trigger.setAttribute("aria-selected", String(isActive));
      trigger.setAttribute("tabindex", isActive ? "0" : "-1");
    }

    for (const content of this.contents()) {
      const isActive = content.getAttribute(TABS_VALUE) === newValue;
      setAttr(content, TABS_STATE, isActive ? "active" : "inactive");
      if (isActive) {
        content.removeAttribute("hidden");
      } else {
        content.setAttribute("hidden", "");
      }
    }

    dispatchBambiEvent<TabsValueChangeDetail>(this.root, TABS_EVENT_VALUE_CHANGE, {
      detail: { value: newValue, previousValue, source },
    });
    this.options.onValueChange?.(newValue);
  }

  private bindEvents(
    isControlled: boolean,
    disabled: boolean,
    orientation: TabsOrientation,
  ): void {
    const { signal } = this.abort;

    this.root.addEventListener(
      "click",
      (event: Event) => {
        if (disabled) return;
        const target = (event.target as Element).closest(`[${TABS_TRIGGER}]`);
        if (!target || !this.root.contains(target)) return;
        const value = target.getAttribute(TABS_VALUE);
        if (!value) return;

        if (!isControlled) {
          this.applyValue(value, "click");
        } else {
          dispatchBambiEvent<TabsValueChangeDetail>(this.root, TABS_EVENT_VALUE_CHANGE, {
            detail: { value, previousValue: this.currentValue, source: "click" },
          });
          this.options.onValueChange?.(value);
        }
      },
      { signal },
    );

    this.root.addEventListener(
      "keydown",
      (event: Event) => {
        if (disabled) return;
        const e = event as KeyboardEvent;
        const activeTriggers = this.triggers().filter(
          (t) => !getBoolAttr(t, "disabled") && t.getAttribute("aria-disabled") !== "true",
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
