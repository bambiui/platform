import { defineComponent } from "../shared/define-component";
import { enumProp, boolProp } from "../shared/props";
import { setBoolAttr } from "../shared/attributes";

export const buttonVariants = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
  "success",
  "warning",
] as const;

export const buttonSizes = ["sm", "md", "lg", "icon"] as const;

export type ButtonVariant = (typeof buttonVariants)[number];
export type ButtonSize = (typeof buttonSizes)[number];

export const button = defineComponent({
  name: "button",
  tag: "button",
  root: "data-bambi-button",
  props: {
    variant: enumProp(buttonVariants, {
      attr: "data-variant",
      default: "primary",
    }),
    size: enumProp(buttonSizes, {
      attr: "data-size",
      default: "md",
    }),
    disabled: boolProp({
      attr: "data-disabled",
    }),
    loading: boolProp({
      attr: "data-loading",
    }),
  },
  sync(el, props) {
    const variant = props.variant ?? "primary";
    const size = props.size ?? "md";
    const loading = Boolean(props.loading);
    const disabled = Boolean(props.disabled || loading);
    const isNativeButton = el.tagName.toLowerCase() === "button";

    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    setBoolAttr(el, "data-disabled", disabled);
    setBoolAttr(el, "data-loading", loading);
    setBoolAttr(el, "aria-busy", loading);

    if (isNativeButton && el instanceof HTMLButtonElement) {
      if (!el.getAttribute("type")) el.type = "button";
      el.disabled = disabled;
      el.removeAttribute("aria-disabled");
    } else {
      el.removeAttribute("disabled");
      setBoolAttr(el, "aria-disabled", disabled);
    }
  },
});

export const Button = button;
export const buttonContract = button.contract;
