import {
  buttonAppearances,
  buttonIntents,
  buttonSizes,
  type ButtonDefaults,
} from "./types";

export interface ButtonRecipe {
  className: string;
  defaults: ButtonDefaults;
  variants: {
    intent: typeof buttonIntents;
    appearance: typeof buttonAppearances;
    size: typeof buttonSizes;
    state: readonly ["loading", "disabled"];
  };
}

export const buttonRecipe = {
  className: "bambi-button",
  defaults: {
    intent: "primary",
    appearance: "solid",
    size: "md",
    loading: false,
  },
  variants: {
    intent: buttonIntents,
    appearance: buttonAppearances,
    size: buttonSizes,
    state: ["loading", "disabled"],
  },
} satisfies ButtonRecipe;
