<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cardRecipe } from "./recipe";
  import type { CardBaseProps } from "./types";
  import "./card.css";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class">, CardBaseProps {
    class?: string;
  }

  let {
    children,
    variant = cardRecipe.defaults.variant,
    size = cardRecipe.defaults.size,
    interactive = cardRecipe.defaults.interactive,
    class: className,
    ...attrs
  }: Props = $props();

  const cls = $derived([cardRecipe.className, className].filter(Boolean).join(" "));
</script>

<div
  {...attrs}
  class={cls}
  data-variant={variant}
  data-size={size}
  data-interactive={interactive || undefined}
>
  {@render children?.()}
</div>
