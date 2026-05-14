export type TabsOrientation = "horizontal" | "vertical";

export interface TabsOptions {
  value?: string;
  defaultValue?: string;
  controlled?: boolean;
  orientation?: TabsOrientation;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}
