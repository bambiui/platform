<script setup lang="ts">
defineOptions({ inheritAttrs: false });
interface Props {
  value: string;
}
const props = defineProps<Props>();
</script>
<template>
  <div
    v-bind="$attrs"
    data-bambi-tabs-content=""
    :data-value="props.value"
  >
    <slot />
  </div>
</template>
