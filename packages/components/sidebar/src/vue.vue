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
      groups?: Array<{
        label?: string;
        items: Array<{
          label: string;
          href?: string;
          active?: boolean;
          disabled?: boolean;
          icon?: string;
          onClick?: () => void;
        }>;
      }>;
      items?: Array<{
        label: string;
        href?: string;
        active?: boolean;
        disabled?: boolean;
        icon?: string;
        onClick?: () => void;
      }>;
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
const slots = defineSlots<{
  default?: () => unknown;
  header?: () => unknown;
  footer?: () => unknown;
}>();

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
const normalizedGroups = computed(() => props.groups ?? (props.items ? [{ items: props.items }] : []));
const hasConvenienceContent = computed(() =>
  Boolean(!slots.default && (slots.header || slots.footer || props.groups || props.items)),
);
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
    <template v-if="hasConvenienceContent">
      <div v-if="slots.header" class="bambi-sidebar-header">
        <slot name="header" />
      </div>
      <div class="bambi-sidebar-content">
        <div
          v-for="(group, groupIndex) in normalizedGroups"
          :key="`${group.label ?? 'group'}-${groupIndex}`"
          class="bambi-sidebar-group"
        >
          <span v-if="group.label" class="bambi-sidebar-group-label">{{ group.label }}</span>
          <ul class="bambi-sidebar-menu">
            <li
              v-for="(item, itemIndex) in group.items"
              :key="`${item.label}-${itemIndex}`"
              class="bambi-sidebar-menu-item"
            >
              <a
                v-if="item.href && !item.disabled"
                class="bambi-sidebar-menu-button"
                :href="item.href"
                :data-active="item.active || undefined"
                :aria-current="item.active ? 'page' : undefined"
              >
                <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
              <button
                v-else
                type="button"
                class="bambi-sidebar-menu-button"
                :data-active="item.active || undefined"
                :data-disabled="item.disabled || undefined"
                :aria-current="item.active ? 'page' : undefined"
                :aria-disabled="item.disabled || undefined"
                :disabled="item.disabled"
                @click="item.onClick"
              >
                <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div v-if="slots.footer" class="bambi-sidebar-footer">
        <slot name="footer" />
      </div>
    </template>
    <slot v-else />
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
