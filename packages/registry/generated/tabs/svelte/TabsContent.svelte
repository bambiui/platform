<script lang="ts">

interface Props {
  value: string;
  [key: string]: unknown;
}
let { value, ...props }: Props = $props();
</script>
<div
  {...props}
  data-bambi-tabs-content=""
    data-value={value}
>
  {@render (props as { children?: import("svelte").Snippet }).children?.()}
</div>
