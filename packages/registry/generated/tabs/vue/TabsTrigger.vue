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
    v-bind="$attrs"
    type="button"
    :disabled="props.disabled"
    :data-disabled="props.disabled ? 'true' : undefined"
    data-bambi-tabs-trigger=""
    :data-value="props.value"
  >
    <slot />
  </button>
</template>
