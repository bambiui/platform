import { cardSizes, cardVariants, type CardDefaults } from "./types";

export interface CardRecipe {
  className: string;
  defaults: CardDefaults;
  variants: {
    variant: typeof cardVariants;
    size: typeof cardSizes;
  };
}

export const cardRecipe = {
  className: "bambi-card",
  defaults: {
    variant: "default",
    size: "md",
    interactive: false,
  },
  variants: {
    variant: cardVariants,
    size: cardSizes,
  },
} satisfies CardRecipe;
