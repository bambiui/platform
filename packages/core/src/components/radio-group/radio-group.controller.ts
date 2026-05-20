import {
  createRovingFocus,
  type RovingFocus,
} from "@bambiui/core/primitives/roving-focus";
import {
  RADIO_GROUP_CONTROLLED,
  RADIO_GROUP_DEFAULT_VALUE,
  RADIO_GROUP_DISABLED,
  RADIO_GROUP_EVENT_VALUE_CHANGE,
  RADIO_GROUP_INDICATOR,
  RADIO_GROUP_INPUT,
  RADIO_GROUP_INVALID,
  RADIO_GROUP_ITEM,
  RADIO_GROUP_LABEL,
  RADIO_GROUP_LOOP,
  RADIO_GROUP_NAME,
  RADIO_GROUP_ORIENTATION,
  RADIO_GROUP_REQUIRED,
  RADIO_GROUP_ROOT,
  RADIO_GROUP_STATE,
  RADIO_GROUP_VALUE,
  type RadioGroupOrientation,
  type RadioGroupValueChangeDetail,
} from "./radio-group.contract.js";

export type {
  RadioGroupOrientation,
  RadioGroupValueChangeDetail,
} from "./radio-group.contract.js";
export { radioGroupContract } from "./radio-group.contract.js";

export interface BambiController {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}

export interface RadioGroupOptions {
  value?: string;
  defaultValue?: string;
  name?: string;
  orientation?: RadioGroupOrientation;
  loop?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaErrormessage?: string;
  controlled?: boolean;
}

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

function dispatchRadioGroupEvent(
  element: Element,
  detail: RadioGroupValueChangeDetail,
): void {
  element.dispatchEvent(
    new CustomEvent<RadioGroupValueChangeDetail>(
      RADIO_GROUP_EVENT_VALUE_CHANGE,
      {
        bubbles: true,
        cancelable: false,
        composed: false,
        detail,
      },
    ),
  );
}

export class RadioGroupController implements BambiController {
  private static _idCounter = 0;

  private readonly root: Element;
  private options: RadioGroupOptions;
  private currentValue: string | null = null;
  private readonly _id: string;
  private readonly fallbackName: string;
  private readonly destroyAbort: AbortController;
  private bindAbort: AbortController;
  private rovingFocus: RovingFocus | null = null;

  constructor(root: Element, options: RadioGroupOptions = {}) {
    this.root = root;
    this.options = options;
    this._id =
      root.id || `bambi-radio-group-${++RadioGroupController._idCounter}`;
    this.fallbackName = `${this._id}-name`;
    this.destroyAbort = new AbortController();
    this.bindAbort = new AbortController();
  }

  sync(): void {
    this.bindAbort.abort();
    this.rovingFocus?.destroy();
    this.bindAbort = new AbortController();

    this.syncRootAttributes();

    const initialValue =
      (this.options.value ?? getAttr(this.root, RADIO_GROUP_VALUE, "")) ||
      (this.options.defaultValue ??
        getAttr(this.root, RADIO_GROUP_DEFAULT_VALUE, "")) ||
      this.checkedInputValue() ||
      this.firstEnabledValue();

    if (initialValue) this.applyState(initialValue);
    else this.applyState(null);

    this.bindEvents();
  }

  update(options: RadioGroupOptions = {}): void {
    const prevOrientation = this.orientation();
    const prevLoop = this.loop();
    this.options = { ...this.options, ...options };
    this.syncRootAttributes();

    if (this.orientation() !== prevOrientation || this.loop() !== prevLoop) {
      this.rovingFocus?.destroy();
      this.rovingFocus = this.createRovingFocusInstance();
    }

    if (options.value !== undefined) {
      this.applyState(options.value || null);
    } else if (this.currentValue) {
      this.applyState(this.currentValue);
    } else {
      const fallback = this.firstEnabledValue();
      this.applyState(fallback);
    }
  }

  destroy(): void {
    this.destroyAbort.abort();
    this.bindAbort.abort();
    this.rovingFocus?.destroy();
  }

  private syncRootAttributes(): void {
    this.root.setAttribute(RADIO_GROUP_ROOT, "");
    this.root.setAttribute("role", "radiogroup");
    setAttr(this.root, RADIO_GROUP_ORIENTATION, this.orientation());
    setAttr(this.root, RADIO_GROUP_LOOP, this.loop() ? "true" : "false");
    setAttr(this.root, RADIO_GROUP_NAME, this.name());
    setAttr(this.root, RADIO_GROUP_DISABLED, this.disabled() ? "true" : null);
    setAttr(this.root, RADIO_GROUP_REQUIRED, this.required() ? "true" : null);
    setAttr(this.root, RADIO_GROUP_INVALID, this.invalid() ? "true" : null);
    setAttr(
      this.root,
      RADIO_GROUP_CONTROLLED,
      this.controlled() ? "true" : null,
    );
    setAttr(this.root, "aria-orientation", this.orientation());
    setAttr(this.root, "aria-required", this.required() ? "true" : null);
    setAttr(this.root, "aria-invalid", this.invalid() ? "true" : null);
    this.syncAriaOption("aria-label", this.options.ariaLabel);
    this.syncAriaOption("aria-labelledby", this.options.ariaLabelledby);
    this.syncAriaOption("aria-describedby", this.options.ariaDescribedby);
    this.syncAriaOption("aria-errormessage", this.options.ariaErrormessage);
  }

  private syncAriaOption(name: string, value: string | undefined): void {
    if (value !== undefined) setAttr(this.root, name, value || null);
  }

  private orientation(): RadioGroupOrientation {
    return (this.options.orientation ??
      getAttr(
        this.root,
        RADIO_GROUP_ORIENTATION,
        "vertical",
      )) as RadioGroupOrientation;
  }

  private loop(): boolean {
    if (this.options.loop !== undefined) return this.options.loop;
    const attr = this.root.getAttribute(RADIO_GROUP_LOOP);
    return attr === null ? true : attr === "true";
  }

  private name(): string {
    return (
      (this.options.name ?? getAttr(this.root, RADIO_GROUP_NAME, "")) ||
      this.fallbackName
    );
  }

  private controlled(): boolean {
    return (
      this.options.controlled ?? getBoolAttr(this.root, RADIO_GROUP_CONTROLLED)
    );
  }

  private disabled(): boolean {
    return (
      this.options.disabled ?? getBoolAttr(this.root, RADIO_GROUP_DISABLED)
    );
  }

  private required(): boolean {
    return (
      this.options.required ?? getBoolAttr(this.root, RADIO_GROUP_REQUIRED)
    );
  }

  private invalid(): boolean {
    return this.options.invalid ?? getBoolAttr(this.root, RADIO_GROUP_INVALID);
  }

  private items(): Element[] {
    return Array.from(this.root.querySelectorAll(`[${RADIO_GROUP_ITEM}]`));
  }

  private inputs(): HTMLInputElement[] {
    return Array.from(
      this.root.querySelectorAll(`[${RADIO_GROUP_INPUT}]`),
    ).filter(
      (input): input is HTMLInputElement => input instanceof HTMLInputElement,
    );
  }

  private indicatorsFor(item: Element): Element[] {
    return Array.from(item.querySelectorAll(`[${RADIO_GROUP_INDICATOR}]`));
  }

  private inputFor(item: Element): HTMLInputElement | null {
    const input = item.querySelector(`[${RADIO_GROUP_INPUT}]`);
    return input instanceof HTMLInputElement ? input : null;
  }

  private itemForInput(input: Element): Element | null {
    return input.closest(`[${RADIO_GROUP_ITEM}]`);
  }

  private valueForItem(item: Element): string {
    return (
      item.getAttribute(RADIO_GROUP_VALUE) ?? this.inputFor(item)?.value ?? ""
    );
  }

  private checkedInputValue(): string | null {
    return this.inputs().find((input) => input.checked)?.value ?? null;
  }

  private firstEnabledValue(): string | null {
    return this.firstEnabledValueFromItems(this.items());
  }

  private firstEnabledValueFromItems(items: Element[]): string | null {
    const item = items.find((candidate) => !this.isItemDisabled(candidate));
    return item ? this.valueForItem(item) : null;
  }

  private isItemDisabled(item: Element): boolean {
    return this.disabled() || getBoolAttr(item, RADIO_GROUP_DISABLED);
  }

  private applyState(value: string | null): void {
    const selectedValue = value ?? "";
    if (!this.controlled() && value)
      setAttr(this.root, RADIO_GROUP_VALUE, value);
    if (!value && !this.controlled())
      setAttr(this.root, RADIO_GROUP_VALUE, null);
    this.currentValue = value;

    const items = this.items();
    const firstEnabledValue = value
      ? null
      : this.firstEnabledValueFromItems(items);

    for (const item of items) {
      const itemValue = this.valueForItem(item);
      const input = this.inputFor(item);
      const itemDisabled = getBoolAttr(item, RADIO_GROUP_DISABLED);
      const disabled = this.disabled() || itemDisabled;
      const checked = value !== null && itemValue === selectedValue;
      const state = checked ? "checked" : "unchecked";

      if (!item.id) item.id = `${this._id}-item-${itemValue}`;
      setAttr(item, RADIO_GROUP_VALUE, itemValue);
      setAttr(item, RADIO_GROUP_STATE, state);
      setAttr(item, RADIO_GROUP_DISABLED, itemDisabled ? "true" : null);

      if (input) {
        if (!input.id) input.id = `${this._id}-input-${itemValue}`;
        input.type = "radio";
        input.name = this.name();
        input.value = itemValue;
        input.checked = checked;
        input.disabled = disabled;
        input.required = this.required();
        input.tabIndex =
          checked || (!value && itemValue === firstEnabledValue) ? 0 : -1;
        input.setAttribute("aria-invalid", this.invalid() ? "true" : "false");
      }

      for (const indicator of this.indicatorsFor(item)) {
        setAttr(indicator, RADIO_GROUP_STATE, state);
      }

      const label = item.querySelector(`[${RADIO_GROUP_LABEL}]`);
      if (label instanceof HTMLLabelElement && input && !label.htmlFor)
        label.htmlFor = input.id;
    }
  }

  private applyValue(
    newValue: string,
    source: RadioGroupValueChangeDetail["source"],
  ): void {
    if (!newValue || newValue === this.currentValue || this.disabled()) {
      this.applyState(this.currentValue);
      return;
    }

    const previousValue = this.currentValue;
    if (!this.controlled()) {
      this.applyState(newValue);
    } else {
      this.applyState(this.currentValue);
    }

    dispatchRadioGroupEvent(this.root, {
      value: newValue,
      previousValue,
      source,
    });
  }

  private focusInput(input: Element): void {
    if (input instanceof HTMLElement) input.focus();
  }

  private createRovingFocusInstance(): RovingFocus {
    return createRovingFocus(this.root, {
      orientation: this.orientation(),
      loop: this.loop(),
      getItems: () => this.inputs(),
      isDisabled: (input) => {
        const item = this.itemForInput(input);
        return !item || this.isItemDisabled(item);
      },
      onFocus: (input) => {
        this.focusInput(input);
        const item = this.itemForInput(input);
        if (item) this.applyValue(this.valueForItem(item), "keyboard");
      },
      onActivate: (input) => {
        const item = this.itemForInput(input);
        if (item) this.applyValue(this.valueForItem(item), "keyboard");
      },
    });
  }

  private bindEvents(): void {
    const signal = this.bindAbort.signal;

    this.root.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const item = target.closest(`[${RADIO_GROUP_ITEM}]`);
        if (!item || !this.root.contains(item) || this.isItemDisabled(item))
          return;
        event.preventDefault();
        this.inputFor(item)?.focus();
        this.applyValue(this.valueForItem(item), "click");
      },
      { signal },
    );

    this.root.addEventListener(
      "change",
      (event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLInputElement) ||
          !target.hasAttribute(RADIO_GROUP_INPUT)
        )
          return;
        const item = this.itemForInput(target);
        if (item) this.applyValue(this.valueForItem(item), "programmatic");
      },
      { signal },
    );

    const form = this.inputs()[0]?.form;
    form?.addEventListener(
      "reset",
      () => {
        window.setTimeout(() => {
          if (this.controlled()) {
            this.applyState(this.options.value ?? this.currentValue);
          } else {
            const value =
              (this.options.defaultValue ??
                getAttr(this.root, RADIO_GROUP_DEFAULT_VALUE, "")) ||
              this.checkedInputValue() ||
              this.firstEnabledValue();
            this.applyState(value);
          }
        });
      },
      { signal },
    );

    this.rovingFocus = this.createRovingFocusInstance();
  }
}
