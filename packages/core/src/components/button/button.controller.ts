import {
  BUTTON_DISABLED,
  BUTTON_LOADING,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  type ButtonSize,
  type ButtonVariant,
} from "./button.contract.js";

export type { ButtonSize, ButtonVariant } from "./button.contract.js";
export { buttonContract } from "./button.contract.js";

export interface BambiController {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}

export interface ButtonOptions {
  as?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
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

export class ButtonController implements BambiController {
  private readonly root: Element;
  private options: ButtonOptions;

  constructor(root: Element, options: ButtonOptions = {}) {
    this.root = root;
    this.options = options;
  }

  sync(): void {
    this.applyState();
  }

  update(options: ButtonOptions = {}): void {
    this.options = { ...this.options, ...options };
    this.applyState();
  }

  destroy(): void {}

  private applyState(): void {
    const variant = this.options.variant ?? getAttr(this.root, BUTTON_VARIANT, "primary");
    const size = this.options.size ?? getAttr(this.root, BUTTON_SIZE, "md");
    const disabled = this.options.disabled ?? getBoolAttr(this.root, BUTTON_DISABLED);
    const loading = this.options.loading ?? getBoolAttr(this.root, BUTTON_LOADING);
    const effectivelyDisabled = disabled || loading;
    const isNativeButton = this.root.tagName.toLowerCase() === "button";

    setAttr(this.root, BUTTON_VARIANT, variant);
    setAttr(this.root, BUTTON_SIZE, size);
    setAttr(this.root, BUTTON_DISABLED, effectivelyDisabled ? "true" : null);
    setAttr(this.root, BUTTON_LOADING, loading ? "true" : null);
    setAttr(this.root, "aria-busy", loading ? "true" : null);

    if (isNativeButton) {
      if (this.root instanceof HTMLButtonElement && !this.root.getAttribute("type")) {
        this.root.type = "button";
      }
      if (this.root instanceof HTMLButtonElement) {
        this.root.disabled = effectivelyDisabled;
      } else {
        setAttr(this.root, "disabled", effectivelyDisabled ? "" : null);
      }
      this.root.removeAttribute("aria-disabled");
    } else {
      setAttr(this.root, "disabled", null);
      setAttr(this.root, "aria-disabled", effectivelyDisabled ? "true" : null);
    }
  }
}
