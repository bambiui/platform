export const sidebarSides = ["left", "right"] as const;
export const sidebarCollapsibles = ["icon", "offcanvas", "none"] as const;

export type SidebarSide = (typeof sidebarSides)[number];

export type SidebarCollapsible = (typeof sidebarCollapsibles)[number];

export interface SidebarBaseProps {
  side?: SidebarSide;
  collapsible?: SidebarCollapsible;
  defaultOpen?: boolean;
  open?: boolean;
}

export type SidebarDefaults = Required<Pick<SidebarBaseProps, "side" | "collapsible" | "defaultOpen">>;
