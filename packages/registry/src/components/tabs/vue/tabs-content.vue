<script setup lang="ts">
const props = defineProps<{
  value: string;
  class?: string;
}>();
</script>

<template>
  <div
    role="tabpanel"
    data-bambi-tabs-content
    :data-value="value"
    :class="props.class"
    tabindex="0"
  >
    <slot />
  </div>
</template>
