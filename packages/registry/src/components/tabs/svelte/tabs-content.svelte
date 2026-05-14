<script lang="ts">
  interface Props {
    value: string;
    class?: string;
    children?: import("svelte").Snippet;
  }
  let { value, class: className, children }: Props = $props();
</script>

<div
  role="tabpanel"
  data-bambi-tabs-content=""
  data-value={value}
  class={className}
  tabindex="0"
>
  {@render children?.()}
</div>
