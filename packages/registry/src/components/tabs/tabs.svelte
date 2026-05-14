<script lang="ts">
  import { onMount } from "svelte";
  import { TabsController } from "./tabs.controller";
  import type { TabsOptions } from "./tabs.controller";

  interface Props extends Omit<TabsOptions, "onValueChange"> {
    class?: string;
    children?: import("svelte").Snippet;
    onValueChange?: (value: string) => void;
  }

  let {
    value,
    defaultValue,
    controlled,
    orientation = "horizontal",
    disabled,
    onValueChange,
    class: className,
    children,
  }: Props = $props();

  let rootEl: HTMLDivElement | undefined = $state();
  let controller: TabsController | undefined;

  const isControlled = $derived(controlled ?? value !== undefined);

  onMount(() => {
    if (!rootEl) return;
    controller = new TabsController(rootEl, {
      value,
      defaultValue,
      controlled: isControlled,
      orientation,
      disabled,
      onValueChange,
    });
    controller.sync();
    return () => controller?.destroy();
  });

  $effect(() => {
    controller?.update({ value, disabled, orientation, onValueChange });
  });
</script>

<div
  bind:this={rootEl}
  data-bambi-tabs=""
  data-orientation={orientation}
  data-controlled={isControlled ? "true" : "false"}
  class={className}
>
  {@render children?.()}
</div>
