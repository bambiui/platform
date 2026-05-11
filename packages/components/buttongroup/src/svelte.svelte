<script lang="ts">
  import type { SvelteHTMLElements } from "svelte/elements";
  import { buttonGroupRecipe } from "./recipe";
  import type { ButtonGroupBaseProps } from "./types";
  import "./buttongroup.css";

  type DivAttributes = SvelteHTMLElements["div"];

  interface Props extends DivAttributes, ButtonGroupBaseProps {
    class?: string;
  }

  let {
    children,
    role = "group",
    orientation = buttonGroupRecipe.defaults.orientation,
    attached = buttonGroupRecipe.defaults.attached,
    class: className,
    ...attrs
  }: Props = $props();

  const cls = $derived(
    [buttonGroupRecipe.className, className].filter(Boolean).join(" ")
  );
</script>

<div
  {role}
  class={cls}
  data-orientation={orientation}
  data-attached={attached || undefined}
  {...attrs}
>
  {@render children?.()}
</div>
