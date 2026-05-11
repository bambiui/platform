export const inputVariants = ["outline", "filled", "flushed", "unstyled"] as const;
export const inputSizes = ["sm", "md", "lg"] as const;
export const inputTones = ["default", "danger", "success", "warning"] as const;
export const inputLabelModes = ["normal", "floating"] as const;

export type InputVariant = (typeof inputVariants)[number];
export type InputSize = (typeof inputSizes)[number];
export type InputTone = (typeof inputTones)[number];
export type InputLabelMode = (typeof inputLabelModes)[number];

export interface InputBaseProps {
  variant?: InputVariant;
  size?: InputSize;
  tone?: InputTone;
  invalid?: boolean;
  fullWidth?: boolean;
}

export interface InputFieldBaseProps {
  variant?: InputVariant;
  size?: InputSize;
  tone?: InputTone;
  invalid?: boolean;
  fullWidth?: boolean;
  label?: string;
  labelMode?: InputLabelMode;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export type InputDefaults = Required<
  Pick<InputBaseProps, "variant" | "size" | "tone" | "fullWidth">
>;

export type InputFieldDefaults = Required<
  Pick<InputFieldBaseProps, "variant" | "size" | "tone" | "fullWidth" | "labelMode">
>;
