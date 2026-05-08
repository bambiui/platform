<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import type { ButtonBaseProps } from "./types";

  interface Props extends HTMLButtonAttributes, ButtonBaseProps {
    class?: string;
  }

  let {
    children,
    type = "button",
    intent = "primary",
    appearance = "solid",
    size = "md",
    loading = false,
    disabled,
    class: className,
    ...attrs
  }: Props = $props();

  const cls = $derived(
    ["bambi-button", className].filter(Boolean).join(" ")
  );
</script>

<button
  {type}
  class={cls}
  data-intent={intent}
  data-appearance={appearance}
  data-size={size}
  data-loading={loading || undefined}
  aria-busy={loading || undefined}
  aria-disabled={(loading || disabled) || undefined}
  {disabled}
  {...attrs}
>
  {#if loading}
    <span class="bambi-button-spinner" aria-hidden="true"></span>
  {/if}
  <span class="bambi-button-content">
    {@render children?.()}
  </span>
</button>
