<script setup lang="ts">
const props = defineProps<{
  value: string;
  class?: string;
  disabled?: boolean;
}>();
</script>

<template>
  <button
    role="tab"
    type="button"
    data-bambi-tabs-trigger
    :data-value="value"
    :data-disabled="disabled ? 'true' : undefined"
    :disabled="disabled"
    :class="props.class"
  >
    <slot />
  </button>
</template>
