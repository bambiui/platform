import { drawerSides, drawerSizes, type DrawerDefaults } from "./types";

export interface DrawerRecipe {
  className: string;
  defaults: DrawerDefaults;
  variants: {
    side: typeof drawerSides;
    size: typeof drawerSizes;
  };
}

export const drawerRecipe = {
  className: "bambi-drawer",
  defaults: {
    side: "right",
    size: "md",
    defaultOpen: false,
    closeOnOverlayClick: true,
  },
  variants: {
    side: drawerSides,
    size: drawerSizes,
  },
} satisfies DrawerRecipe;
