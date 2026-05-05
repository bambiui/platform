import { type ButtonHTMLAttributes, type Ref } from "react";
import type { ButtonBaseProps } from "@bambi-ui/button";
import { cn } from "@bambi-ui/theme";

export type { ButtonVariant, ButtonSize, ButtonBaseProps } from "@bambi-ui/button";

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
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={(loading || disabled) || undefined}
      disabled={disabled}
      className={cn("bambi-button", className)}
      {...props}
    >
      {loading && <span className="bambi-button-spinner" aria-hidden="true" />}
      <span className="bambi-button-content">{children}</span>
    </button>
  );
}
