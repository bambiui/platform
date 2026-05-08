import type { ButtonAppearance, ButtonIntent, ButtonSize } from "@bambiui/core";

export interface RecipeDefinition {
  base: string[];
  variants: Record<string, readonly string[]>;
}

export function createRecipe<T extends RecipeDefinition>(recipe: T) {
  return recipe;
}

export const buttonRecipe = createRecipe({
  base: ["bambi-button"],
  variants: {
    intent: ["primary", "secondary", "danger", "success", "warning"] satisfies ButtonIntent[],
    appearance: ["solid", "outline", "ghost", "link"] satisfies ButtonAppearance[],
    size: ["sm", "md", "lg", "icon"] satisfies ButtonSize[],
    state: ["loading", "disabled"],
  },
});
