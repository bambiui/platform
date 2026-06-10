import { createEffect, onCleanup, onMount, splitProps, type JSX } from "solid-js";
import { button } from "../components/button";
import "../styles/button.css";

export interface ButtonProps
  extends JSX.HTMLAttributes<HTMLElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "disabled",
    "loading"
  ]);
  let element!: HTMLElement;
  let instance: ReturnType<typeof button.mount> | undefined;
  const variant = () => local.variant ?? "primary";
  const size = () => local.size ?? "md";
  const disabled = () => local.disabled ?? undefined;
  const loading = () => local.loading ?? undefined;

  onMount(() => {
    instance = button.mount(element, {
        variant: variant(),
        size: size(),
        disabled: disabled(),
        loading: loading(),
    });
  });

  createEffect(() => {
    instance?.update({
        variant: variant(),
        size: size(),
        disabled: disabled(),
        loading: loading(),
    });
  });

  onCleanup(() => {
    instance?.destroy();
  });

  return (
    <button
      {...rest}
      ref={element}
      data-bambi-button=""
      data-variant={variant()}
      data-size={size()}
      data-disabled={disabled() ? "true" : undefined}
      data-loading={loading() ? "true" : undefined}
    />
  );
}
