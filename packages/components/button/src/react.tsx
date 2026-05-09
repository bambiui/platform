import { forwardRef, type ButtonHTMLAttributes } from "react";
import { buttonRecipe } from "./recipe";
import type { ButtonBaseProps } from "./types";
import "./button.css";

export type {
  ButtonAppearance,
  ButtonBaseProps,
  ButtonIntent,
  ButtonSize,
} from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonBaseProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      type = "button",
      intent = buttonRecipe.defaults.intent,
      appearance = buttonRecipe.defaults.appearance,
      size = buttonRecipe.defaults.size,
      loading = buttonRecipe.defaults.loading,
      disabled,
      ...props
    },
    ref,
  ) {
    const isLoading = Boolean(loading);
    const isDisabled = Boolean(disabled || isLoading);

    return (
      <button
        ref={ref}
        type={type}
        data-intent={intent}
        data-appearance={appearance}
        data-size={size}
        data-loading={isLoading || undefined}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        className={cn(buttonRecipe.className, className)}
        {...props}
      >
        {isLoading && (
          <span className="bambi-button-spinner" aria-hidden="true" />
        )}
        <span className="bambi-button-content">{children}</span>
      </button>
    );
  },
);
