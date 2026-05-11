export const buttonGroupOrientations = ["horizontal", "vertical"] as const;

export type ButtonGroupOrientation = (typeof buttonGroupOrientations)[number];

export interface ButtonGroupBaseProps {
  orientation?: ButtonGroupOrientation;
  attached?: boolean;
}

export type ButtonGroupDefaults = Required<ButtonGroupBaseProps>;
