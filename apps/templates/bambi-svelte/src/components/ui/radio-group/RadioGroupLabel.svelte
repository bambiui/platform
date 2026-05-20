<script lang="ts">
import { type Snippet } from "svelte";

interface Props {
  children?: Snippet;
  [key: string]: unknown;
}
let { children, ...props }: Props = $props();

</script>
<label
  {...props}
  data-bambi-radio-group-label=""
>
  {@render children?.()}
</label>
