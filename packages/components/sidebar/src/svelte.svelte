<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { sidebarRecipe } from "./recipe";
  import type { SidebarBaseProps } from "./types";
  import "./sidebar.css";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class">, SidebarBaseProps {
    class?: string;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    children,
    side = sidebarRecipe.defaults.side,
    collapsible = sidebarRecipe.defaults.collapsible,
    defaultOpen = sidebarRecipe.defaults.defaultOpen,
    open: controlledOpen,
    onOpenChange,
    class: className,
    ...attrs
  }: Props = $props();

  let internalOpen = $state(defaultOpen);
  const isControlled = $derived(controlledOpen !== undefined);
  const open = $derived(isControlled ? (controlledOpen ?? defaultOpen) : internalOpen);

  function setOpen(next: boolean) {
    if (!isControlled) internalOpen = next;
    onOpenChange?.(next);
  }

  function toggle() {
    setOpen(!open);
  }

  const state = $derived(open ? "open" : "closed");
  const cls = $derived([sidebarRecipe.className, className].filter(Boolean).join(" "));
</script>

{#if collapsible === "offcanvas"}
  <div
    class="bambi-sidebar-overlay"
    data-state={state}
    aria-hidden="true"
    role="presentation"
    onclick={() => setOpen(false)}
  ></div>
{/if}

<nav
  {...attrs}
  class={cls}
  data-state={state}
  data-side={side}
  data-collapsible={collapsible}
  aria-label="Sidebar navigation"
>
  {@render children?.()}
  <div class="bambi-sidebar-rail">
    <button
      type="button"
      class="bambi-sidebar-rail-trigger"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={open}
      onclick={toggle}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d={open ? "M7 2L4 5l3 3" : "M3 2l3 3-3 3"}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</nav>
