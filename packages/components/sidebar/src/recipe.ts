import { sidebarCollapsibles, sidebarSides, type SidebarDefaults } from "./types";

export interface SidebarRecipe {
  className: string;
  defaults: SidebarDefaults;
  variants: {
    side: typeof sidebarSides;
    collapsible: typeof sidebarCollapsibles;
  };
}

export const sidebarRecipe = {
  className: "bambi-sidebar",
  defaults: {
    side: "left",
    collapsible: "offcanvas",
    defaultOpen: true,
  },
  variants: {
    side: sidebarSides,
    collapsible: sidebarCollapsibles,
  },
} satisfies SidebarRecipe;
