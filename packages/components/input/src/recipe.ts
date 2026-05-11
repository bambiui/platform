import {
  inputVariants,
  inputSizes,
  inputTones,
  inputLabelModes,
  type InputFieldDefaults,
} from "./types";

export interface InputRecipe {
  fieldClassName: string;
  labelClassName: string;
  controlClassName: string;
  elementClassName: string;
  startClassName: string;
  endClassName: string;
  descriptionClassName: string;
  errorClassName: string;
  defaults: InputFieldDefaults;
  variants: {
    variant: typeof inputVariants;
    size: typeof inputSizes;
    tone: typeof inputTones;
    labelMode: typeof inputLabelModes;
    state: readonly ["invalid", "disabled", "readonly", "required", "filled", "focused"];
  };
}

export const inputRecipe = {
  fieldClassName: "bambi-input-field",
  labelClassName: "bambi-input-label",
  controlClassName: "bambi-input-control",
  elementClassName: "bambi-input-element",
  startClassName: "bambi-input-start",
  endClassName: "bambi-input-end",
  descriptionClassName: "bambi-input-description",
  errorClassName: "bambi-input-error",
  defaults: {
    variant: "outline",
    size: "md",
    tone: "default",
    labelMode: "normal",
    fullWidth: false,
  },
  variants: {
    variant: inputVariants,
    size: inputSizes,
    tone: inputTones,
    labelMode: inputLabelModes,
    state: ["invalid", "disabled", "readonly", "required", "filled", "focused"],
  },
} satisfies InputRecipe;
