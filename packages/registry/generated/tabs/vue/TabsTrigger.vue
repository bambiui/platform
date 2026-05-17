<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { computed, inject, type ComputedRef } from "vue";
interface Props {
  value: string;
  disabled?: boolean;
}
const props = defineProps<Props>();

const selectedValue = inject<ComputedRef<string | undefined>>("bambi-tabs-value");
const hasSelectedValue = computed(() => selectedValue?.value !== undefined);
const isSelected = computed(() => selectedValue?.value === props.value);
</script>
<template>
  <button
    v-bind="$attrs"
    type="button"
    :disabled="props.disabled"
    :data-disabled="props.disabled ? 'true' : undefined"
    data-bambi-tabs-trigger=""
    :data-value="props.value"
    :role="'tab'"
    :data-state="hasSelectedValue ? (isSelected ? 'active' : 'inactive') : undefined"
    :aria-selected="hasSelectedValue ? (isSelected ? true : false) : undefined"
    :tabindex="hasSelectedValue ? (isSelected ? 0 : -1) : undefined"
  >
    <slot />
  </button>
</template>
