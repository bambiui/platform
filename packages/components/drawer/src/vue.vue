<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, watch } from "vue";
import { drawerRecipe } from "./recipe";
import type { DrawerBaseProps } from "./types";
import "./drawer.css";

defineOptions({ name: "BambiDrawer", inheritAttrs: false });

const props = withDefaults(
  defineProps<
    DrawerBaseProps & {
      class?: string;
      onOpenChange?: (open: boolean) => void;
    }
  >(),
  {
    ...drawerRecipe.defaults,
    class: undefined,
    open: undefined,
    onOpenChange: undefined,
  },
);

const emit = defineEmits<{ openChange: [open: boolean] }>();

const attrs = useAttrs();
const titleId = `bambi-drawer-title-${Math.random().toString(36).slice(2, 7)}`;
const descId = `bambi-drawer-desc-${Math.random().toString(36).slice(2, 7)}`;

const internalOpen = ref(props.defaultOpen ?? drawerRecipe.defaults.defaultOpen);
const isControlled = computed(() => props.open !== undefined);
const open = computed(() => (isControlled.value ? props.open! : internalOpen.value));
const state = computed(() => (open.value ? "open" : "closed"));
const contentEl = ref<HTMLDivElement | null>(null);

function setOpen(next: boolean) {
  if (!isControlled.value) internalOpen.value = next;
  emit("openChange", next);
  props.onOpenChange?.(next);
}

function close() {
  setOpen(false);
}

// Scroll lock
watch(open, (isOpen) => {
  if (typeof document === "undefined") return;
  if (isOpen) {
    const scrollY = window.scrollY;
    const pad = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (pad > 0) document.body.style.paddingRight = `${pad}px`;
    (document.body as HTMLElement & { _scrollY?: number })._scrollY = scrollY;
  } else {
    const scrollY = (document.body as HTMLElement & { _scrollY?: number })._scrollY ?? 0;
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, scrollY);
  }
});

// Focus management
watch(open, (isOpen) => {
  if (!isOpen || !contentEl.value) return;
  const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const first = contentEl.value.querySelector<HTMLElement>(FOCUSABLE);
  setTimeout(() => first?.focus(), 0);
});

// Inert background
watch(open, (isOpen) => {
  if (typeof document === "undefined" || !contentEl.value) return;
  const el = contentEl.value;
  const siblings = Array.from(document.body.children).filter(
    (c) => c !== el && !el.contains(c),
  );
  if (isOpen) {
    siblings.forEach((s) => s.setAttribute("inert", ""));
  } else {
    siblings.forEach((s) => s.removeAttribute("inert"));
  }
});

// Escape + focus trap
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    close();
    return;
  }
  if (e.key !== "Tab" || !contentEl.value) return;
  const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const els = Array.from(contentEl.value.querySelectorAll<HTMLElement>(FOCUSABLE));
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

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("keydown", handleKeyDown);
  } else {
    document.removeEventListener("keydown", handleKeyDown);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeyDown);
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});
</script>

<template>
  <Teleport to="body">
    <div
      class="bambi-drawer-overlay"
      :data-state="state"
      aria-hidden="true"
      @click="props.closeOnOverlayClick ? close() : undefined"
    />
    <div
      v-bind="attrs"
      ref="contentEl"
      :class="['bambi-drawer-content', props.class].filter(Boolean).join(' ')"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      tabindex="-1"
      :data-state="state"
      :data-side="props.side"
      :data-size="props.size"
    >
      <button type="button" class="bambi-drawer-close" aria-label="Close" @click="close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <slot />
    </div>
  </Teleport>
</template>
