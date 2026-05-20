<script lang="ts">
import { getContext, type Snippet } from "svelte";

interface Props {
  value: string;
  disabled?: boolean;
  children?: Snippet;
  [key: string]: unknown;
}
let { value, disabled, children, ...props }: Props = $props();

const selectedValue = getContext<(() => string | undefined) | undefined>("bambi-radio-group-value");
const hasSelectedValue = $derived(selectedValue?.() !== undefined);
const isSelected = $derived(selectedValue?.() === value);
</script>
<div
  {...props}
    data-disabled={disabled ? "true" : undefined}
  data-bambi-radio-group-item=""
    data-value={value}
    data-state={hasSelectedValue ? (isSelected ? "checked" : "unchecked") : undefined}
>
  <input
    data-bambi-radio-group-input=""
    type={"radio"}
    value={value}
    disabled={disabled}
    checked={hasSelectedValue ? isSelected : undefined}
    readonly={true}
  />
  {@render children?.()}
</div>
