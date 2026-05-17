<script lang="ts">
import { getContext, type Snippet } from "svelte";

interface Props {
  value: string;
  children?: Snippet;
  [key: string]: unknown;
}
let { value, children, ...props }: Props = $props();

const selectedValue = getContext<(() => string | undefined) | undefined>("bambi-tabs-value");
const hasSelectedValue = $derived(selectedValue?.() !== undefined);
const isSelected = $derived(selectedValue?.() === value);
</script>
<div
  {...props}
  data-bambi-tabs-content=""
    data-value={value}
    role={"tabpanel"}
    data-state={hasSelectedValue ? (isSelected ? "active" : "inactive") : undefined}
    hidden={hasSelectedValue ? (isSelected ? false : true) : undefined}
>
  {@render children?.()}
</div>
