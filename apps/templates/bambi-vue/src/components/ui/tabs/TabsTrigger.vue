<script setup lang="ts">
defineOptions({ inheritAttrs: false });
interface Props {
  value: string;
  disabled?: boolean;
}
const props = defineProps<Props>();
</script>
<template>
  <button
      type="button"
      :disabled="props.disabled"
      :data-disabled="props.disabled ? 'true' : undefined"
    data-bambi-tabs-trigger=""
      :data-value="props.value"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
