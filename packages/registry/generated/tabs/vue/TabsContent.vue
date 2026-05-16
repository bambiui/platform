<script setup lang="ts">
defineOptions({ inheritAttrs: false });
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
