import { forwardRef, type HTMLAttributes } from "react";
import { buttonGroupRecipe } from "./recipe";
import type { ButtonGroupBaseProps } from "./types";
import "./buttongroup.css";

export type {
  ButtonGroupBaseProps,
  ButtonGroupDefaults,
  ButtonGroupOrientation,
} from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export interface ButtonGroupProps
  extends HTMLAttributes<HTMLDivElement>, ButtonGroupBaseProps {}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    {
      children,
      className,
      role = "group",
      orientation = buttonGroupRecipe.defaults.orientation,
      attached = buttonGroupRecipe.defaults.attached,
      ...props
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role={role}
        data-orientation={orientation}
        data-attached={attached || undefined}
        className={cn(buttonGroupRecipe.className, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
