<script lang="ts">
import { type Snippet } from "svelte";

interface Props {
  children?: Snippet;
  [key: string]: unknown;
}
let { children, ...props }: Props = $props();

</script>
<span
  {...props}
  data-bambi-radio-group-indicator=""
>
  {@render children?.()}
</span>
