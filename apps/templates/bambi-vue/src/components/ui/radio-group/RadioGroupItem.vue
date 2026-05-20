<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { computed, inject, type ComputedRef } from "vue";
interface Props {
  value: string;
  disabled?: boolean;
}
const props = defineProps<Props>();

const selectedValue = inject<ComputedRef<string | undefined>>("bambi-radio-group-value");
const hasSelectedValue = computed(() => selectedValue?.value !== undefined);
const isSelected = computed(() => selectedValue?.value === props.value);
</script>
<template>
  <div
    v-bind="$attrs"
    :data-disabled="props.disabled ? 'true' : undefined"
    data-bambi-radio-group-item=""
    :data-value="props.value"
    :data-state="hasSelectedValue ? (isSelected ? 'checked' : 'unchecked') : undefined"
  >
    <input
      data-bambi-radio-group-input=""
      :type="'radio'"
      :value="props.value"
      :disabled="props.disabled"
      :checked="hasSelectedValue ? isSelected : undefined"
      :readonly="true"
    />

    <slot />
  </div>
</template>
