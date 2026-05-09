import {
  bambiAppearances,
  bambiIntents,
  bambiSizes,
  type BambiAppearance,
  type BambiIntent,
  type BambiSize,
} from "./contracts";

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
