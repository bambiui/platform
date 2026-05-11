export const drawerSides = ["top", "right", "bottom", "left"] as const;
export const drawerSizes = ["sm", "md", "lg", "xl", "full"] as const;

export type DrawerSide = (typeof drawerSides)[number];

export type DrawerSize = (typeof drawerSizes)[number];

export interface DrawerBaseProps {
  side?: DrawerSide;
  size?: DrawerSize;
  defaultOpen?: boolean;
  open?: boolean;
  closeOnOverlayClick?: boolean;
  trigger?: unknown;
  title?: unknown;
  description?: unknown;
  footer?: unknown;
}

export type DrawerDefaults = Required<Pick<DrawerBaseProps, "side" | "size" | "defaultOpen" | "closeOnOverlayClick">>;
