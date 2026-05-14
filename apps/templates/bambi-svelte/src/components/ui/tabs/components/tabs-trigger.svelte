<script lang="ts">
  interface Props {
    value: string;
    class?: string;
    disabled?: boolean;
    children?: import("svelte").Snippet;
  }
  let { value, class: className, disabled, children }: Props = $props();
</script>

<button
  role="tab"
  type="button"
  data-bambi-tabs-trigger=""
  data-value={value}
  data-disabled={disabled ? "true" : undefined}
  {disabled}
  class={className}
>
  {@render children?.()}
</button>
