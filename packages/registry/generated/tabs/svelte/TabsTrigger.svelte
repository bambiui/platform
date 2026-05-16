<script lang="ts">

interface Props {
  value: string;
  disabled?: boolean;
  [key: string]: unknown;
}
let { value, disabled, ...props }: Props = $props();
</script>
<button
  {...props}
    type={props.type ?? "button"}
    disabled={disabled}
    data-disabled={disabled ? "true" : undefined}
  data-bambi-tabs-trigger=""
    data-value={value}
>
  {@render (props as { children?: import("svelte").Snippet }).children?.()}
</button>
