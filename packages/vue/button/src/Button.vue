<script setup lang="ts">
import { computed, useAttrs } from "vue";
import type { ButtonBaseProps } from "@bambi-ui/button";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<ButtonBaseProps & { class?: string; disabled?: boolean; type?: "button" | "submit" | "reset" }>(),
  { variant: "primary", size: "md", loading: false, type: "button" }
);

const attrs = useAttrs();

const cls = computed(() =>
  ["bambi-button", props.class].filter(Boolean).join(" ")
);
</script>

<template>
  <button
    :type="props.type"
    :class="cls"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-loading="props.loading || undefined"
    :aria-busy="props.loading || undefined"
    :aria-disabled="(props.loading || props.disabled) || undefined"
    :disabled="props.disabled"
    v-bind="attrs"
  >
    <span v-if="props.loading" class="bambi-button-spinner" aria-hidden="true" />
    <span class="bambi-button-content"><slot /></span>
  </button>
</template>
