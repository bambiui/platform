import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { button } from "../components/button";
import "../styles/button.css";

export interface ButtonProps extends HTMLAttributes<HTMLElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      disabled,
      loading,
      children,
      ...props
    },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const instanceRef = useRef<ReturnType<typeof button.mount> | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => localRef.current as HTMLElement,
      [],
    );

    useEffect(() => {
      const element = localRef.current;
      if (!element) return;

      const instance = button.mount(element, {
        variant,
        size,
        disabled,
        loading,
      });
      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
    }, []);

    useEffect(() => {
      instanceRef.current?.update({
        variant,
        size,
        disabled,
        loading,
      });
    }, [variant, size, disabled, loading]);

    return (
      <button
        {...props}
        ref={localRef as never}
        data-bambi-button=""
        data-variant={variant}
        data-size={size}
        data-disabled={disabled ? "true" : undefined}
        data-loading={loading ? "true" : undefined}
      >
        {children}
      </button>
    );
  },
);
