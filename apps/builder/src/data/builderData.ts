export const colorGroups = [
  {
    label: "Base",
    tokens: ["background", "foreground", "card", "card-foreground", "border", "separator"],
  },
  {
    label: "Brand",
    tokens: ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground", "muted", "muted-foreground"],
  },
  {
    label: "Semantic",
    tokens: ["danger", "danger-foreground", "success", "success-foreground", "warning", "warning-foreground", "ring"],
  },
  {
    label: "Input",
    tokens: ["input", "input-background", "input-foreground", "input-placeholder"],
  },
];

export const typeSizes = [
  { label: "xs", token: "--bambi-text-xs", value: "0.75rem" },
  { label: "sm", token: "--bambi-text-sm", value: "0.875rem" },
  { label: "base", token: "--bambi-text-base", value: "1rem" },
  { label: "lg", token: "--bambi-text-lg", value: "1.125rem" },
];

export const typeWeights = [
  { label: "Normal", token: "--bambi-font-weight-normal", value: "400" },
  { label: "Medium", token: "--bambi-font-weight-medium", value: "500" },
  { label: "Semibold", token: "--bambi-font-weight-semibold", value: "600" },
  { label: "Bold", token: "--bambi-font-weight-bold", value: "700" },
];
