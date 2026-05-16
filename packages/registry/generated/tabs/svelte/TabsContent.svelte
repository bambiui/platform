<script lang="ts">
import { type Snippet } from "svelte";

interface Props {
  value: string;
  children?: Snippet;
  [key: string]: unknown;
}
let { value, children, ...props }: Props = $props();
</script>
<div
  {...props}
  data-bambi-tabs-content=""
    data-value={value}
>
  {@render children?.()}
</div>
