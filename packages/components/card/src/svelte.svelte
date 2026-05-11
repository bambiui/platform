<script lang="ts">
  /* global HTMLDivElement */
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cardRecipe } from "./recipe";
  import type { CardBaseProps } from "./types";
  import "./card.css";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class">, CardBaseProps {
    class?: string;
    title?: string;
    description?: string;
    header?: Snippet;
    footer?: Snippet;
    actions?: Snippet;
  }

  let {
    children,
    variant = cardRecipe.defaults.variant,
    size = cardRecipe.defaults.size,
    interactive = cardRecipe.defaults.interactive,
    title,
    description,
    header,
    footer,
    actions,
    class: className,
    ...attrs
  }: Props = $props();

  const cls = $derived([cardRecipe.className, className].filter(Boolean).join(" "));
  const hasHeader = $derived(Boolean(header || title || description));
  const hasFooter = $derived(Boolean(footer || actions));
</script>

<div
  {...attrs}
  class={cls}
  data-variant={variant}
  data-size={size}
  data-interactive={interactive || undefined}
>
  {#if hasHeader}
    <div class="bambi-card-header">
      {#if header}
        {@render header()}
      {:else}
        {#if title}<h3 class="bambi-card-title">{title}</h3>{/if}
        {#if description}<p class="bambi-card-description">{description}</p>{/if}
      {/if}
    </div>
  {/if}
  {#if hasHeader || hasFooter}
    <div class="bambi-card-content">{@render children?.()}</div>
  {:else}
    {@render children?.()}
  {/if}
  {#if hasFooter}
    <div class="bambi-card-footer">
      {#if footer}
        {@render footer()}
      {:else if actions}
        {@render actions()}
      {/if}
    </div>
  {/if}
</div>
