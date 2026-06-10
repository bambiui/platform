<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { tabs } from "../components/tabs";
  import "../styles/tabs.css";

  interface Props {
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  children?: import("svelte").Snippet;
  [key: string]: unknown;
}

  let {
    value,
      defaultValue,
      orientation = "horizontal",
      activationMode = "automatic",
    children,
    ...rest
  }: Props = $props();

  let element: HTMLElement;
  let instance: ReturnType<typeof tabs.mount> | undefined;

  $effect(() => {
    instance?.update({
    value,
    defaultValue,
    orientation,
    activationMode,
    });
  });

  onMount(() => {
    instance = tabs.mount(element, {
    value,
    defaultValue,
    orientation,
    activationMode,
    });
  });

  onDestroy(() => {
    instance?.destroy();
  });
</script>

<div
  {...rest}
  bind:this={element}
  data-bambi-tabs=""
  data-value={value}
  data-default-value={defaultValue}
  data-orientation={orientation}
  data-activation-mode={activationMode}
>
  {@render children?.()}
</div>
