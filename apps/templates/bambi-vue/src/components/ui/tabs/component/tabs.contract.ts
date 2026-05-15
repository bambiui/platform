import { defineContract } from "./define-contract";

export const TABS_ROOT = "data-bambi-tabs" as const;
export const TABS_LIST = "data-bambi-tabs-list" as const;
export const TABS_TRIGGER = "data-bambi-tabs-trigger" as const;
export const TABS_CONTENT = "data-bambi-tabs-content" as const;
export const TABS_VALUE = "data-value" as const;
export const TABS_DEFAULT_VALUE = "data-default-value" as const;
export const TABS_CONTROLLED = "data-controlled" as const;
export const TABS_ORIENTATION = "data-orientation" as const;
export const TABS_DISABLED = "data-disabled" as const;
export const TABS_STATE = "data-state" as const;
export const TABS_EVENT_VALUE_CHANGE = "bambi:value-change" as const;

export interface TabsValueChangeDetail {
  value: string;
  previousValue: string | null;
  source: "click" | "keyboard" | "sync";
}

export const tabsContract = defineContract({
  name: "tabs",
  parts: [
    { name: "root", selector: `[${TABS_ROOT}]`, attribute: TABS_ROOT, element: "div" },
    { name: "list", selector: `[${TABS_LIST}]`, attribute: TABS_LIST, element: "div", role: "tablist" },
    { name: "trigger", selector: `[${TABS_TRIGGER}]`, attribute: TABS_TRIGGER, element: "button", role: "tab" },
    { name: "content", selector: `[${TABS_CONTENT}]`, attribute: TABS_CONTENT, element: "div", role: "tabpanel" },
  ],
  props: {
    value: { type: "string", attribute: TABS_VALUE, controlled: true },
    defaultValue: { type: "string", attribute: TABS_DEFAULT_VALUE },
    orientation: { type: ["horizontal", "vertical"], attribute: TABS_ORIENTATION, defaultValue: "horizontal" },
    controlled: { type: "boolean", attribute: TABS_CONTROLLED },
    disabled: { type: "boolean", attribute: TABS_DISABLED },
  },
  events: {
    valueChange: { name: TABS_EVENT_VALUE_CHANGE, detail: "string" },
  },
  dataAttributes: {
    state: ["active", "inactive"],
  },
  a11y: {
    roles: {
      list: "tablist",
      trigger: "tab",
      content: "tabpanel",
    },
    keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"],
    relationships: {
      trigger: "aria-controls -> content",
      content: "aria-labelledby -> trigger",
    },
  },
} as const);
