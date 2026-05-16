<script lang="ts">

type Props = Record<string, unknown>;
let { ...props }: Props = $props();
</script>
<div
  {...props}
  data-bambi-tabs-list=""
>
  {@render (props as { children?: import("svelte").Snippet }).children?.()}
</div>
