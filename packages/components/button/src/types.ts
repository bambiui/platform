export type ButtonIntent = "primary" | "secondary" | "danger" | "success" | "warning";

export type ButtonAppearance = "solid" | "outline" | "ghost" | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonBaseProps {
  intent?: ButtonIntent;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  loading?: boolean;
}
