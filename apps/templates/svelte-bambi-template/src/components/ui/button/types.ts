export const bambiIntents = [
  "primary",
  "secondary",
  "danger",
  "success",
  "warning",
] as const;

export const bambiAppearances = ["solid", "outline", "ghost", "link"] as const;

export const bambiSizes = ["sm", "md", "lg", "icon"] as const;

export type BambiIntent = (typeof bambiIntents)[number];

export type BambiAppearance = (typeof bambiAppearances)[number];

export type BambiSize = (typeof bambiSizes)[number];

export const buttonIntents = bambiIntents;

export const buttonAppearances = bambiAppearances;

export const buttonSizes = bambiSizes;

export type ButtonIntent = BambiIntent;

export type ButtonAppearance = BambiAppearance;

export type ButtonSize = BambiSize;

export interface ButtonBaseProps {
  intent?: ButtonIntent;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonDefaults = Required<
  Pick<ButtonBaseProps, "intent" | "appearance" | "size" | "loading">
>;
