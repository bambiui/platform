export type BambiIntent = "primary" | "secondary" | "danger" | "success" | "warning";

export type BambiAppearance = "solid" | "outline" | "ghost" | "link";

export type BambiSize = "sm" | "md" | "lg" | "icon";

export interface ButtonBaseProps {
  intent?: BambiIntent;
  appearance?: BambiAppearance;
  size?: BambiSize;
  loading?: boolean;
}

export type ButtonIntent = BambiIntent;
export type ButtonAppearance = BambiAppearance;
export type ButtonSize = BambiSize;
