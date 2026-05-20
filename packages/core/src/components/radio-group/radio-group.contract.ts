import { defineContract } from "../../../contract/define-contract.js";

export const RADIO_GROUP_ROOT = "data-bambi-radio-group" as const;
export const RADIO_GROUP_ITEM = "data-bambi-radio-group-item" as const;
export const RADIO_GROUP_INPUT = "data-bambi-radio-group-input" as const;
export const RADIO_GROUP_INDICATOR = "data-bambi-radio-group-indicator" as const;
export const RADIO_GROUP_LABEL = "data-bambi-radio-group-label" as const;
export const RADIO_GROUP_VALUE = "data-value" as const;
export const RADIO_GROUP_DEFAULT_VALUE = "data-default-value" as const;
export const RADIO_GROUP_NAME = "data-name" as const;
export const RADIO_GROUP_CONTROLLED = "data-controlled" as const;
export const RADIO_GROUP_ORIENTATION = "data-orientation" as const;
export const RADIO_GROUP_LOOP = "data-loop" as const;
export const RADIO_GROUP_DISABLED = "data-disabled" as const;
export const RADIO_GROUP_REQUIRED = "data-required" as const;
export const RADIO_GROUP_INVALID = "data-invalid" as const;
export const RADIO_GROUP_STATE = "data-state" as const;
export const RADIO_GROUP_EVENT_VALUE_CHANGE = "bambi:value-change" as const;

export type RadioGroupOrientation = "horizontal" | "vertical";

export interface RadioGroupValueChangeDetail {
  value: string;
  previousValue: string | null;
  source: "click" | "keyboard" | "programmatic";
}

export const radioGroupContract = defineContract({
  name: "radio-group",
  parts: [
    { name: "root", selector: `[${RADIO_GROUP_ROOT}]`, attribute: RADIO_GROUP_ROOT, element: "div", role: "radiogroup" },
    { name: "item", selector: `[${RADIO_GROUP_ITEM}]`, attribute: RADIO_GROUP_ITEM, element: "div" },
    { name: "input", selector: `[${RADIO_GROUP_INPUT}]`, attribute: RADIO_GROUP_INPUT, element: "input" },
    { name: "indicator", selector: `[${RADIO_GROUP_INDICATOR}]`, attribute: RADIO_GROUP_INDICATOR, element: "span" },
    { name: "label", selector: `[${RADIO_GROUP_LABEL}]`, attribute: RADIO_GROUP_LABEL, element: "label" },
  ],
  props: {
    value: { type: "string", attribute: RADIO_GROUP_VALUE, controlled: true },
    defaultValue: { type: "string", attribute: RADIO_GROUP_DEFAULT_VALUE },
    name: { type: "string", attribute: RADIO_GROUP_NAME },
    orientation: { type: ["horizontal", "vertical"], attribute: RADIO_GROUP_ORIENTATION, defaultValue: "vertical" },
    loop: { type: "boolean", attribute: RADIO_GROUP_LOOP, defaultValue: true },
    controlled: { type: "boolean", attribute: RADIO_GROUP_CONTROLLED },
    disabled: { type: "boolean", attribute: RADIO_GROUP_DISABLED },
    required: { type: "boolean", attribute: RADIO_GROUP_REQUIRED },
    invalid: { type: "boolean", attribute: RADIO_GROUP_INVALID },
  },
  events: {
    valueChange: { name: RADIO_GROUP_EVENT_VALUE_CHANGE, detail: "object" },
  },
  dataAttributes: {
    state: ["checked", "unchecked"],
  },
  a11y: {
    roles: {
      root: "radiogroup",
    },
    keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Space"],
    relationships: {
      label: "for -> input",
    },
    activation: "arrow keys move focus and selection; Space selects the focused radio",
  },
} as const);
