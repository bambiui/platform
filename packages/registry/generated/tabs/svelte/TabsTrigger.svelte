<script lang="ts">

interface Props {
  value: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  [key: string]: unknown;
}
let { value, disabled, type = "button", ...props }: Props = $props();
</script>
<button
  {...props}
    type={type}
    disabled={disabled}
    data-disabled={disabled ? "true" : undefined}
  data-bambi-tabs-trigger=""
    data-value={value}
>
  {@render (props as { children?: import("svelte").Snippet }).children?.()}
</button>
