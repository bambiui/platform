<script setup lang="ts">
defineOptions({ inheritAttrs: false });




</script>
<template>
  <div
    v-bind="$attrs"
    data-bambi-tabs-list=""
  >
    <slot />
  </div>
</template>
