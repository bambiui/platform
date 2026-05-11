<script lang="ts">
  /* global HTMLElement */
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { sidebarRecipe } from "./recipe";
  import type { SidebarBaseProps } from "./types";
  import "./sidebar.css";

  interface SidebarItem {
    label: string;
    href?: string;
    active?: boolean;
    disabled?: boolean;
    icon?: string;
    onClick?: () => void;
  }

  interface SidebarGroupConfig {
    label?: string;
    items: SidebarItem[];
  }

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class">, SidebarBaseProps {
    class?: string;
    header?: Snippet;
    footer?: Snippet;
    groups?: SidebarGroupConfig[];
    items?: SidebarItem[];
    onOpenChange?: (open: boolean) => void;
  }

  let {
    children,
    side = sidebarRecipe.defaults.side,
    collapsible = sidebarRecipe.defaults.collapsible,
    defaultOpen = sidebarRecipe.defaults.defaultOpen,
    open: controlledOpen,
    onOpenChange,
    header,
    footer,
    groups,
    items,
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
  const normalizedGroups = $derived(groups ?? (items ? [{ items }] : []));
  const hasConvenienceContent = $derived(
    !children && Boolean(header || footer || groups || items),
  );
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
  {#if hasConvenienceContent}
    {#if header}
      <div class="bambi-sidebar-header">{@render header()}</div>
    {/if}
    <div class="bambi-sidebar-content">
      {#each normalizedGroups as group, groupIndex (`${group.label ?? "group"}-${groupIndex}`)}
        <div class="bambi-sidebar-group">
          {#if group.label}
            <span class="bambi-sidebar-group-label">{group.label}</span>
          {/if}
          <ul class="bambi-sidebar-menu">
            {#each group.items as item, itemIndex (`${item.label}-${itemIndex}`)}
              <li class="bambi-sidebar-menu-item">
                {#if item.href && !item.disabled}
                  <a
                    class="bambi-sidebar-menu-button"
                    href={item.href}
                    data-active={item.active || undefined}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {#if item.icon}<span aria-hidden="true">{item.icon}</span>{/if}
                    <span>{item.label}</span>
                  </a>
                {:else}
                  <button
                    type="button"
                    class="bambi-sidebar-menu-button"
                    data-active={item.active || undefined}
                    data-disabled={item.disabled || undefined}
                    aria-current={item.active ? "page" : undefined}
                    aria-disabled={item.disabled || undefined}
                    disabled={item.disabled}
                    onclick={item.onClick}
                  >
                    {#if item.icon}<span aria-hidden="true">{item.icon}</span>{/if}
                    <span>{item.label}</span>
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
    {#if footer}
      <div class="bambi-sidebar-footer">{@render footer()}</div>
    {/if}
  {:else}
    {@render children?.()}
  {/if}
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
