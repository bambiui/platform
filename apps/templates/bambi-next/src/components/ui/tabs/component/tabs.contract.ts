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
