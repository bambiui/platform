<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { button } from "../components/button";
  import "../styles/button.css";

  interface Props {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  children?: import("svelte").Snippet;
  [key: string]: unknown;
}

  let {
    variant = "primary",
      size = "md",
      disabled,
      loading,
    children,
    ...rest
  }: Props = $props();

  let element: HTMLElement;
  let instance: ReturnType<typeof button.mount> | undefined;

  $effect(() => {
    instance?.update({
    variant,
    size,
    disabled,
    loading,
    });
  });

  onMount(() => {
    instance = button.mount(element, {
    variant,
    size,
    disabled,
    loading,
    });
  });

  onDestroy(() => {
    instance?.destroy();
  });
</script>

<button
  {...rest}
  bind:this={element}
  data-bambi-button=""
  data-variant={variant}
  data-size={size}
  data-disabled={disabled ? "true" : undefined}
  data-loading={loading ? "true" : undefined}
>
  {@render children?.()}
</button>
