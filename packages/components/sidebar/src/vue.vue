<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import { sidebarRecipe } from "./recipe";
import type { SidebarBaseProps } from "./types";
import "./sidebar.css";

defineOptions({ name: "BambiSidebar", inheritAttrs: false });

const props = withDefaults(
  defineProps<
    SidebarBaseProps & {
      class?: string;
      onOpenChange?: (open: boolean) => void;
    }
  >(),
  {
    ...sidebarRecipe.defaults,
    class: undefined,
    open: undefined,
    onOpenChange: undefined,
  },
);

const emit = defineEmits<{ openChange: [open: boolean] }>();

const attrs = useAttrs();
const internalOpen = ref(props.defaultOpen ?? sidebarRecipe.defaults.defaultOpen);

const isControlled = computed(() => props.open !== undefined);
const open = computed(() => (isControlled.value ? props.open! : internalOpen.value));

function setOpen(next: boolean) {
  if (!isControlled.value) internalOpen.value = next;
  emit("openChange", next);
  props.onOpenChange?.(next);
}

const state = computed(() => (open.value ? "open" : "closed"));
const cls = computed(() => [sidebarRecipe.className, props.class].filter(Boolean).join(" "));
</script>

<template>
  <div
    v-if="props.collapsible === 'offcanvas'"
    class="bambi-sidebar-overlay"
    :data-state="state"
    aria-hidden="true"
    @click="setOpen(false)"
  />
  <nav
    v-bind="attrs"
    :class="cls"
    :data-state="state"
    :data-side="props.side"
    :data-collapsible="props.collapsible"
    aria-label="Sidebar navigation"
  >
    <slot />
    <div class="bambi-sidebar-rail">
      <button
        type="button"
        class="bambi-sidebar-rail-trigger"
        :aria-label="open ? 'Collapse sidebar' : 'Expand sidebar'"
        :aria-expanded="open"
        @click="setOpen(!open)"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            :d="open ? 'M7 2L4 5l3 3' : 'M3 2l3 3-3 3'"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </nav>
</template>
