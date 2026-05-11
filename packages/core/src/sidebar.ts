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

export interface SidebarItem {
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  icon?: unknown;
  onClick?: unknown;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

export type SidebarDefaults = Required<Pick<SidebarBaseProps, "side" | "collapsible" | "defaultOpen">>;
