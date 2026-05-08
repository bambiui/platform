<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { buttonRecipe } from "./recipe";
  import type { ButtonBaseProps } from "./types";
  import "./button.css";

  interface Props extends HTMLButtonAttributes, ButtonBaseProps {
    class?: string;
  }

  let {
    children,
    type = "button",
    intent = buttonRecipe.defaults.intent,
    appearance = buttonRecipe.defaults.appearance,
    size = buttonRecipe.defaults.size,
    loading = buttonRecipe.defaults.loading,
    disabled,
    class: className,
    ...attrs
  }: Props = $props();

  const cls = $derived(
    [buttonRecipe.className, className].filter(Boolean).join(" ")
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
