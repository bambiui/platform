<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cardRecipe } from "./recipe";
import type { CardBaseProps } from "./types";
import "./card.css";

defineOptions({ name: "BambiCard", inheritAttrs: false });

const props = withDefaults(
  defineProps<
    CardBaseProps & {
      class?: string;
      title?: string;
      description?: string;
    }
  >(),
  { ...cardRecipe.defaults, class: undefined },
);

const attrs = useAttrs();
const slots = defineSlots<{
  default?: () => unknown;
  header?: () => unknown;
  footer?: () => unknown;
  actions?: () => unknown;
}>();
const cls = computed(() =>
  [cardRecipe.className, props.class].filter(Boolean).join(" "),
);
const hasHeader = computed(() => Boolean(slots.header || props.title || props.description));
const hasFooter = computed(() => Boolean(slots.footer || slots.actions));
</script>

<template>
  <div
    v-bind="attrs"
    :class="cls"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-interactive="props.interactive || undefined"
  >
    <div v-if="hasHeader" class="bambi-card-header">
      <slot name="header">
        <h3 v-if="props.title" class="bambi-card-title">{{ props.title }}</h3>
        <p v-if="props.description" class="bambi-card-description">
          {{ props.description }}
        </p>
      </slot>
    </div>
    <div v-if="hasHeader || hasFooter" class="bambi-card-content">
      <slot />
    </div>
    <slot v-else />
    <div v-if="hasFooter" class="bambi-card-footer">
      <slot name="footer">
        <slot name="actions" />
      </slot>
    </div>
  </div>
</template>
