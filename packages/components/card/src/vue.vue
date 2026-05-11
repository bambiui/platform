<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cardRecipe } from "./recipe";
import type { CardBaseProps } from "./types";
import "./card.css";

defineOptions({ name: "BambiCard", inheritAttrs: false });

const props = withDefaults(
  defineProps<CardBaseProps & { class?: string }>(),
  { ...cardRecipe.defaults, class: undefined },
);

const attrs = useAttrs();
const cls = computed(() =>
  [cardRecipe.className, props.class].filter(Boolean).join(" "),
);
</script>

<template>
  <div
    v-bind="attrs"
    :class="cls"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-interactive="props.interactive || undefined"
  >
    <slot />
  </div>
</template>
