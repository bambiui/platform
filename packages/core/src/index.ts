export const bambiIntents = ["primary", "secondary", "danger", "success", "warning"] as const;

export const bambiAppearances = ["solid", "outline", "ghost", "link"] as const;

export const bambiSizes = ["sm", "md", "lg", "icon"] as const;

export type BambiIntent = (typeof bambiIntents)[number];

export type BambiAppearance = (typeof bambiAppearances)[number];

export type BambiSize = (typeof bambiSizes)[number];

export interface ButtonBaseProps {
  intent?: BambiIntent;
  appearance?: BambiAppearance;
  size?: BambiSize;
  loading?: boolean;
}

export type ButtonDefaults = Required<Pick<ButtonBaseProps, "intent" | "appearance" | "size" | "loading">>;

export type ButtonIntent = BambiIntent;
export type ButtonAppearance = BambiAppearance;
export type ButtonSize = BambiSize;
