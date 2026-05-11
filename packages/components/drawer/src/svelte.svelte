<script lang="ts">
  /* global HTMLDivElement, HTMLElement, HTMLButtonElement, KeyboardEvent, document, window, setTimeout */
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { drawerRecipe } from "./recipe";
  import type { DrawerBaseProps } from "./types";
  import "./drawer.css";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class">, DrawerBaseProps {
    class?: string;
    trigger?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    title?: string;
    description?: string;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    trigger,
    children,
    footer,
    title,
    description,
    side = drawerRecipe.defaults.side,
    size = drawerRecipe.defaults.size,
    defaultOpen = drawerRecipe.defaults.defaultOpen,
    open: controlledOpen,
    closeOnOverlayClick = drawerRecipe.defaults.closeOnOverlayClick,
    onOpenChange,
    class: className,
    ...attrs
  }: Props = $props();

  let internalOpen = $state(defaultOpen);
  const isControlled = $derived(controlledOpen !== undefined);
  const open = $derived(isControlled ? (controlledOpen ?? false) : internalOpen);
  const state = $derived(open ? "open" : "closed");
  const hasConvenienceContent = $derived(Boolean(title || description || footer));

  let triggerEl: HTMLElement | null = $state(null);
  let contentEl: HTMLElement | null = $state(null);
  const titleId = `bambi-drawer-title-${Math.random().toString(36).slice(2, 7)}`;
  const descId = `bambi-drawer-desc-${Math.random().toString(36).slice(2, 7)}`;

  function setOpen(next: boolean) {
    if (!isControlled) internalOpen = next;
    onOpenChange?.(next);
    if (!next) {
      // Restore focus on close
      setTimeout(() => (triggerEl as HTMLButtonElement | null)?.focus(), 0);
    }
  }

  function close() {
    setOpen(false);
  }

  // Focus trap
  const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== "Tab" || !contentEl) return;
    const els = Array.from(contentEl.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
    trapFocus(e);
  }

  // Scroll lock
  $effect(() => {
    if (open) {
      const scrollY = window.scrollY;
      const pad = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (pad > 0) document.body.style.paddingRight = `${pad}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        window.scrollTo(0, scrollY);
      };
    }
  });

  // Initial focus
  $effect(() => {
    if (open && contentEl) {
      const focusable = contentEl.querySelector<HTMLElement>(FOCUSABLE);
      focusable?.focus();
    }
  });

  // Inert background
  $effect(() => {
    if (!contentEl) return;
    const siblings = Array.from(document.body.children).filter(
      (c) => c !== contentEl && !(contentEl?.contains(c) ?? false),
    );
    if (open) {
      siblings.forEach((s) => s.setAttribute("inert", ""));
    } else {
      siblings.forEach((s) => s.removeAttribute("inert"));
    }
    return () => siblings.forEach((s) => s.removeAttribute("inert"));
  });
</script>

<svelte:window onkeydown={open ? handleKeyDown : undefined} />

{#if trigger}
  <span bind:this={triggerEl} onclick={() => setOpen(true)}>
    {@render trigger()}
  </span>
{/if}

<div
  class="bambi-drawer-overlay"
  data-state={state}
  aria-hidden="true"
  role="presentation"
  onclick={closeOnOverlayClick ? close : undefined}
></div>

<div
  {...attrs}
  bind:this={contentEl}
  class={["bambi-drawer-content", className].filter(Boolean).join(" ")}
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId}
  aria-describedby={descId}
  tabindex="-1"
  data-state={state}
  data-side={side}
  data-size={size}
>
  <button
    type="button"
    class="bambi-drawer-close"
    aria-label="Close"
    onclick={close}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </button>
  {#if title || description}
    <div class="bambi-drawer-header">
      {#if title}<h2 id={titleId} class="bambi-drawer-title">{title}</h2>{/if}
      {#if description}<p id={descId} class="bambi-drawer-description">{description}</p>{/if}
    </div>
  {/if}
  {#if hasConvenienceContent}
    <div class="bambi-drawer-body">{@render children?.()}</div>
  {:else}
    {@render children?.()}
  {/if}
  {#if footer}
    <div class="bambi-drawer-footer">{@render footer()}</div>
  {/if}
</div>
