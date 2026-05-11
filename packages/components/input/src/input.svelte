<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { inputRecipe } from "./recipe";
  import "./input.css";

  interface Props extends Omit<HTMLInputAttributes, "size"> {
    class?: string;
    /** Marks the input as invalid; sets aria-invalid="true". */
    invalid?: boolean;
  }

  let {
    class: className,
    invalid,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...attrs
  }: Props = $props();

  const resolvedInvalid = $derived(
    ariaInvalid !== undefined ? ariaInvalid : invalid ? "true" : undefined,
  );
  const cls = $derived(
    [inputRecipe.elementClassName, className].filter(Boolean).join(" "),
  );
</script>

<input
  {...attrs}
  {id}
  class={cls}
  aria-describedby={ariaDescribedBy}
  aria-invalid={resolvedInvalid}
/>
