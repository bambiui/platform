<script lang="ts">
import { getContext, type Snippet } from "svelte";

interface Props {
  value: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  children?: Snippet;
  [key: string]: unknown;
}
let { value, disabled, type = "button", children, ...props }: Props = $props();

const selectedValue = getContext<(() => string | undefined) | undefined>("bambi-tabs-value");
const hasSelectedValue = $derived(selectedValue?.() !== undefined);
const isSelected = $derived(selectedValue?.() === value);
</script>
<button
  {...props}
    type={type}
    disabled={disabled}
    data-disabled={disabled ? "true" : undefined}
  data-bambi-tabs-trigger=""
    data-value={value}
    role={"tab"}
    data-state={hasSelectedValue ? (isSelected ? "active" : "inactive") : undefined}
    aria-selected={hasSelectedValue ? (isSelected ? true : false) : undefined}
    tabindex={hasSelectedValue ? (isSelected ? 0 : -1) : undefined}
>
  {@render children?.()}
</button>
