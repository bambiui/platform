import { type ButtonHTMLAttributes, type Ref } from "react";
import { buttonRecipe } from "./recipe";
import type { ButtonBaseProps } from "./types";

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
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonBaseProps {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  children,
  className,
  ref,
  type = "button",
  intent = buttonRecipe.defaults.intent,
  appearance = buttonRecipe.defaults.appearance,
  size = buttonRecipe.defaults.size,
  loading = buttonRecipe.defaults.loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      data-intent={intent}
      data-appearance={appearance}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={(loading || disabled) || undefined}
      disabled={disabled}
      className={cn(buttonRecipe.className, className)}
      {...props}
    >
      {loading && <span className="bambi-button-spinner" aria-hidden="true" />}
      <span className="bambi-button-content">{children}</span>
    </button>
  );
}
