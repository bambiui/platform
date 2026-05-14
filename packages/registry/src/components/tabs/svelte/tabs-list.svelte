<script lang="ts">
  interface Props {
    class?: string;
    children?: import("svelte").Snippet;
  }
  let { class: className, children }: Props = $props();
</script>

<div role="tablist" data-bambi-tabs-list="" class={className}>
  {@render children?.()}
</div>
