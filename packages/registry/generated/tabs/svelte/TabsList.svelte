<script lang="ts">
import { type Snippet } from "svelte";

interface Props {
  children?: Snippet;
  [key: string]: unknown;
}
let { children, ...props }: Props = $props();
</script>
<div
  {...props}
  data-bambi-tabs-list=""
>
  {@render children?.()}
</div>
