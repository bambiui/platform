<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { computed, inject, type ComputedRef } from "vue";
interface Props {
  value: string;
}
const props = defineProps<Props>();

const selectedValue = inject<ComputedRef<string | undefined>>("bambi-tabs-value");
const hasSelectedValue = computed(() => selectedValue?.value !== undefined);
const isSelected = computed(() => selectedValue?.value === props.value);
</script>
<template>
  <div
    v-bind="$attrs"
    data-bambi-tabs-content=""
    :data-value="props.value"
    :role="'tabpanel'"
    :data-state="hasSelectedValue ? (isSelected ? 'active' : 'inactive') : undefined"
    :hidden="hasSelectedValue ? (isSelected ? false : true) : undefined"
  >

    <slot />
  </div>
</template>
