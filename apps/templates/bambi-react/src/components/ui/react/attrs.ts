export interface ButtonAttrsOptions {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
}

export function buttonAttrs(options: ButtonAttrsOptions = {}) {
  return {
    "data-bambi-button": "",
    "data-variant": options.variant ?? "primary",
    "data-size": options.size ?? "md",
    "data-disabled": options.disabled ? "true" : undefined,
    "data-loading": options.loading ? "true" : undefined,
  };
}

export interface TabsAttrsOptions {
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
}

export function tabsAttrs(options: TabsAttrsOptions = {}) {
  return {
    "data-bambi-tabs": "",
    "data-value": options.value,
    "data-default-value": options.defaultValue,
    "data-orientation": options.orientation ?? "horizontal",
    "data-activation-mode": options.activationMode ?? "automatic",
  };
}
