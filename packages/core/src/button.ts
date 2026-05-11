import {
  bambiAppearances,
  bambiIntents,
  type BambiAppearance,
  type BambiIntent,
} from "./contracts";

export const buttonIntents = bambiIntents;

export const buttonAppearances = bambiAppearances;

export const buttonSizes = ["sm", "md", "lg", "icon"] as const;

export type ButtonIntent = BambiIntent;

export type ButtonAppearance = BambiAppearance;

export type ButtonSize = (typeof buttonSizes)[number];

export interface ButtonBaseProps {
  intent?: ButtonIntent;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonDefaults = Required<
  Pick<ButtonBaseProps, "intent" | "appearance" | "size" | "loading">
>;
