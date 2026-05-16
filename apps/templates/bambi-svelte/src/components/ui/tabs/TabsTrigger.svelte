<script lang="ts">
import { type Snippet } from "svelte";

interface Props {
  value: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  children?: Snippet;
  [key: string]: unknown;
}
let { value, disabled, type = "button", children, ...props }: Props = $props();
</script>
<button
  {...props}
    type={type}
    disabled={disabled}
    data-disabled={disabled ? "true" : undefined}
  data-bambi-tabs-trigger=""
    data-value={value}
>
  {@render children?.()}
</button>
