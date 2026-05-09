<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { buttonRecipe } from "./recipe";
import type { ButtonBaseProps } from "./types";
import "./button.css";

defineOptions({ name: "BambiButton", inheritAttrs: false });

const props = withDefaults(
  defineProps<
    ButtonBaseProps & {
      class?: string;
      disabled?: boolean;
      type?: "button" | "submit" | "reset";
    }
  >(),
  { ...buttonRecipe.defaults, class: undefined, type: "button" },
);

const attrs = useAttrs();

const cls = computed(() =>
  [buttonRecipe.className, props.class].filter(Boolean).join(" "),
);

const isLoading = computed(() => Boolean(props.loading));
const isDisabled = computed(() => Boolean(props.disabled || isLoading.value));
</script>

<template>
  <button
    :type="props.type"
    :class="cls"
    :data-intent="props.intent"
    :data-appearance="props.appearance"
    :data-size="props.size"
    :data-loading="isLoading || undefined"
    :aria-busy="isLoading || undefined"
    :aria-disabled="isDisabled || undefined"
    :disabled="isDisabled"
    v-bind="attrs"
  >
    <span
      v-if="isLoading"
      class="bambi-button-spinner"
      aria-hidden="true"
    />
    <span class="bambi-button-content"><slot /></span>
  </button>
</template>
