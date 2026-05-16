<script setup lang="ts">
interface Props {
  value: string;
}
const props = defineProps<Props>();
</script>
<template>
  <div
    data-bambi-tabs-content=""
      :data-value="props.value"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>
