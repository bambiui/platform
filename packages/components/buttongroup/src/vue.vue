<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { buttonGroupRecipe } from "./recipe";
import type { ButtonGroupBaseProps } from "./types";
import "./buttongroup.css";

defineOptions({ name: "BambiButtonGroup", inheritAttrs: false });

const props = withDefaults(
  defineProps<
    ButtonGroupBaseProps & {
      class?: string;
      role?: string;
    }
  >(),
  { ...buttonGroupRecipe.defaults, class: undefined, role: "group" },
);

const attrs = useAttrs();

const cls = computed(() =>
  [buttonGroupRecipe.className, props.class].filter(Boolean).join(" "),
);
</script>

<template>
  <div
    :role="props.role"
    :class="cls"
    :data-orientation="props.orientation"
    :data-attached="props.attached || undefined"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>
