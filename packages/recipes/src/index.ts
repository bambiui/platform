import {
  bambiAppearances,
  bambiIntents,
  bambiSizes,
  type ButtonDefaults,
} from "@bambiui/core";

export interface RecipeDefinition<
  Defaults extends Record<string, unknown>,
  Variants extends Record<string, readonly string[]>,
> {
  className: string;
  defaults: Defaults;
  variants: Variants;
}

export function createRecipe<T extends RecipeDefinition<Record<string, unknown>, Record<string, readonly string[]>>>(
  recipe: T,
) {
  return recipe;
}

export const buttonRecipe = createRecipe({
  className: "bambi-button",
  defaults: {
    intent: "primary",
    appearance: "solid",
    size: "md",
    loading: false,
  } satisfies ButtonDefaults,
  variants: {
    intent: bambiIntents,
    appearance: bambiAppearances,
    size: bambiSizes,
    state: ["loading", "disabled"] as const,
  },
});
