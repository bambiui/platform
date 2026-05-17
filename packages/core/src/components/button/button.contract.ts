import { defineContract } from "../../../contract/define-contract.js";

export const BUTTON_ROOT = "data-bambi-button" as const;
export const BUTTON_VARIANT = "data-variant" as const;
export const BUTTON_SIZE = "data-size" as const;
export const BUTTON_DISABLED = "data-disabled" as const;
export const BUTTON_LOADING = "data-loading" as const;

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "warning";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export const buttonContract = defineContract({
  name: "button",
  parts: [
    { name: "root", selector: `[${BUTTON_ROOT}]`, attribute: BUTTON_ROOT, element: "button" },
  ],
  props: {
    variant: {
      type: ["primary", "secondary", "outline", "ghost", "danger", "success", "warning"],
      attribute: BUTTON_VARIANT,
      defaultValue: "primary",
    },
    size: { type: ["sm", "md", "lg", "icon"], attribute: BUTTON_SIZE, defaultValue: "md" },
    disabled: { type: "boolean", attribute: BUTTON_DISABLED },
    loading: { type: "boolean", attribute: BUTTON_LOADING },
  },
  dataAttributes: {
    variant: ["primary", "secondary", "outline", "ghost", "danger", "success", "warning"],
    size: ["sm", "md", "lg", "icon"],
    disabled: ["true"],
    loading: ["true"],
  },
  a11y: {
    roles: {
      root: "button",
    },
    activation: "native button semantics by default; non-button polymorphic roots expose disabled state via aria-disabled",
  },
} as const);
