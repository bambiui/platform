import { buttonGroupOrientations, type ButtonGroupDefaults } from "./types";

export interface ButtonGroupRecipe {
  className: string;
  defaults: ButtonGroupDefaults;
  variants: {
    orientation: typeof buttonGroupOrientations;
    state: readonly ["attached"];
  };
}

export const buttonGroupRecipe = {
  className: "bambi-button-group",
  defaults: {
    orientation: "horizontal",
    attached: true,
  },
  variants: {
    orientation: buttonGroupOrientations,
    state: ["attached"],
  },
} satisfies ButtonGroupRecipe;
